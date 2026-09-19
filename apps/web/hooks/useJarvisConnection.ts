"use client";

import { useEffect, useRef, useState } from "react";
import { loadVoices, pickDarkMaleVoice, stripMarkdownForSpeech } from "@/lib/fallbackVoice";
import { getUIContext } from "@/lib/uiContext";

export interface JarvisMessage {
  role: "user" | "assistant";
  content: string;
  audioUrl?: string;
}

const WS_URL = process.env.NEXT_PUBLIC_JARVIS_WS_URL ?? "ws://localhost:4000/ws";
// Same backoff shape as the speech-recognition retry in useVoiceCommands —
// the socket previously never reconnected after dropping (server restart,
// a stale dev tunnel, a network blip), leaving the AI fallback dead until a
// full page reload.
const RECONNECT_BASE_DELAY_MS = 500;
const RECONNECT_MAX_DELAY_MS = 5000;

function decodeAudio(base64: string, contentType: string): string {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: contentType });
  return URL.createObjectURL(blob);
}

type QueueItem =
  | { kind: "clip"; url: string; onStart?: () => void }
  | { kind: "speech"; text: string; onStart?: () => void };

/**
 * Owns the WebSocket connection to the JARVIS backend, the Claude chat
 * round-trip, and voice playback + live amplitude analysis. The browser's
 * own speechSynthesis is the active voice (no ElevenLabs network round-trip
 * in the live flow) — the `clip`/ElevenLabs queue path is kept dormant in
 * case a server response ever includes real audio again. Kept UI-agnostic
 * so both the plain chat page and the Eira experience share the exact same
 * working connection.
 */
export function useJarvisConnection() {
  const [messages, setMessages] = useState<JarvisMessage[]>([]);
  const [connected, setConnected] = useState(false);
  const [pending, setPending] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  const socketRef = useRef<WebSocket | null>(null);
  const conversationIdRef = useRef<string | undefined>(undefined);
  const voiceEnabledRef = useRef(voiceEnabled);
  const audioLevelRef = useRef(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const onAssistantTextRef = useRef<((text: string) => void) | undefined>(undefined);

  // Sequential playback queue — every voice output (ElevenLabs clips, the
  // browser-speechSynthesis fallback, local-command confirmations) goes
  // through this so nothing ever overlaps.
  const audioQueueRef = useRef<QueueItem[]>([]);
  const isPlayingRef = useRef(false);

  // Identifies the single "live" utterance. Cancelling speechSynthesis still
  // fires the cancelled utterance's onend/onerror in most browsers, so every
  // handler checks its own id against this ref before acting — a stale
  // callback from an interrupted utterance is simply ignored instead of
  // advancing the queue a second time or reporting a false "speaking" state.
  const utteranceGenerationRef = useRef(0);
  // Only relevant to the dormant ElevenLabs clip path — tracked so
  // interruptSpeech() can actually silence it, not just ignore its callbacks.
  const beforeSpeechRef = useRef<(() => Promise<void>) | undefined>(undefined);
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    voiceEnabledRef.current = voiceEnabled;
  }, [voiceEnabled]);

  useEffect(() => {
    let cancelled = false;
    let reconnectAttempt = 0;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

    function connect() {
      const socket = new WebSocket(WS_URL);
      socketRef.current = socket;

      socket.onopen = () => {
        reconnectAttempt = 0;
        setConnected(true);
      };
      socket.onclose = () => {
        setConnected(false);
        setPending(false);
        if (cancelled) return;
        // Backend restarted, dev tunnel went stale, network blip, ... —
        // keep trying instead of leaving the AI fallback dead until the
        // user manually reloads the page.
        const delay = Math.min(RECONNECT_BASE_DELAY_MS * 2 ** reconnectAttempt, RECONNECT_MAX_DELAY_MS);
        reconnectAttempt += 1;
        reconnectTimeout = setTimeout(connect, delay);
      };
      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "conversation") {
          conversationIdRef.current = data.conversationId;
        } else if (data.type === "speech-chunk") {
          if (!voiceEnabledRef.current) return;
          if (data.audio && data.audioType) {
            enqueueClip(decodeAudio(data.audio, data.audioType));
          } else if (data.text) {
            // ElevenLabs failed for this sentence (quota/plan) — fall back to
            // the browser's own voice, silently, no error shown to the user.
            enqueueSpeech(data.text);
          }
        } else if (data.type === "message") {
          setPending(false);
          setMessages((prev) => [...prev, { role: "assistant", content: data.content }]);
          onAssistantTextRef.current?.(data.content);
        } else if (data.type === "error") {
          setPending(false);
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: `Error: ${data.message}` },
          ]);
        }
      };
    }

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      socketRef.current?.close();
    };
  }, []);

  function ensureAudioContext(): AudioContext {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext ?? (window as any).webkitAudioContext;
      audioCtxRef.current = new AudioCtx();
    }
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }

  /** Adds an ElevenLabs clip to the playback queue. onStart (optional) fires
   * the moment THIS clip actually begins audible playback — used to measure
   * real speech-start latency. */
  function enqueueClip(audioUrl: string, onStart?: () => void) {
    audioQueueRef.current.push({ kind: "clip", url: audioUrl, onStart });
    if (!isPlayingRef.current) playNextInQueue();
  }

  /** Adds a browser-speechSynthesis fallback utterance to the same queue,
   * so it never overlaps with ElevenLabs clips either. */
  function enqueueSpeech(text: string, onStart?: () => void) {
    audioQueueRef.current.push({ kind: "speech", text, onStart });
    if (!isPlayingRef.current) playNextInQueue();
  }

  function playNextInQueue() {
    const next = audioQueueRef.current.shift();
    if (!next) {
      isPlayingRef.current = false;
      audioLevelRef.current = 0;
      setSpeaking(false);
      return;
    }

    isPlayingRef.current = true;
    setSpeaking(true);
    if (next.kind === "clip") {
      playSingleClip(next.url, playNextInQueue, next.onStart);
    } else {
      playFallbackSpeech(next.text, playNextInQueue, next.onStart);
    }
  }

  function playSingleClip(audioUrl: string, onEnded: () => void, onStart?: () => void) {
    const myGeneration = ++utteranceGenerationRef.current;
    const stale = () => utteranceGenerationRef.current !== myGeneration;

    const audioCtx = audioCtxRef.current;
    const audio = new Audio(audioUrl);
    activeAudioRef.current = audio;

    if (!audioCtx) {
      // No AudioContext yet (couldn't create one on the last user gesture) —
      // still play the voice, just without driving the brain's pulse.
      audio.play().then(() => !stale() && onStart?.()).catch(() => !stale() && onEnded());
      audio.onended = () => !stale() && onEnded();
      return;
    }

    const source = audioCtx.createMediaElementSource(audio);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    const data = new Uint8Array(analyser.frequencyBinCount);
    source.connect(analyser);
    analyser.connect(audioCtx.destination);

    function tick() {
      if (stale()) return;
      analyser.getByteFrequencyData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i];
      audioLevelRef.current = sum / data.length / 255;
      if (!audio.paused && !audio.ended) requestAnimationFrame(tick);
    }

    audio.play().then(() => {
      if (stale()) return;
      onStart?.();
      tick();
    }).catch(() => !stale() && onEnded());
    audio.onended = () => !stale() && onEnded();
  }

  /** Jarvis's primary voice: the browser's own TTS, tuned dark/calm/
   * robotic-ish via a low pitch and rate on the darkest available male
   * voice (Swedish preferred, British English otherwise — see
   * lib/fallbackVoice.ts). Since speechSynthesis exposes no audio stream to
   * analyse, the brain's pulse is faked with a smooth oscillation for the
   * utterance's duration instead of sitting still. */
  async function playFallbackSpeech(text: string, onEnded: () => void, onStart?: () => void) {
    // Identifies this call's utterance — checked before every callback below
    // acts, so a cancelled/superseded utterance's late onend/onerror is a
    // silent no-op instead of double-advancing the queue or reporting stale
    // "speaking" state (see interruptSpeech).
    const myGeneration = ++utteranceGenerationRef.current;
    const stale = () => utteranceGenerationRef.current !== myGeneration;

    if (!("speechSynthesis" in window)) {
      onEnded();
      return;
    }

    await beforeSpeechRef.current?.();
    if (stale()) return;
    const voices = await loadVoices();
    if (stale()) return; // interrupted while voices were loading

    const voice = pickDarkMaleVoice(voices);

    const utterance = new SpeechSynthesisUtterance(stripMarkdownForSpeech(text));
    utterance.lang = voice?.lang ?? "sv-SE";
    utterance.pitch = 0.5;
    utterance.rate = 0.9;
    utterance.volume = 1;
    if (voice) utterance.voice = voice;

    let pulseFrame = 0;
    let active = true;
    function pulse() {
      if (!active || stale()) return;
      pulseFrame += 1;
      audioLevelRef.current = 0.28 + 0.22 * Math.abs(Math.sin(pulseFrame * 0.12));
      requestAnimationFrame(pulse);
    }

    const finish = () => {
      if (stale() || !active) return;
      active = false;
      activeUtteranceRef.current = null;
      console.log("[voice] speech ended");
      onEnded();
    };

    utterance.onstart = () => {
      if (stale()) return;
      console.log("[voice] speech started");
      onStart?.();
      pulse();
    };
    utterance.onend = finish;
    utterance.onerror = (event) => {
      console.error("[voice] speech error", event.error);
      finish();
    };

    // No cancel() here: our own queue (playNextInQueue) already guarantees
    // only one utterance plays at a time, and Chrome/Edge's cancel() is
    // asynchronous under the hood — calling it immediately before speak()
    // can silently swallow the utterance that follows it (Eira "replies"
    // but says nothing). cancel() is still used in interruptSpeech() below,
    // where the mic button genuinely needs to cut her off mid-sentence.
    activeUtteranceRef.current = utterance;
    try {
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.error("[voice] speech error", error);
      finish();
    }
  }

  function sendMessage(text: string) {
    const socket = socketRef.current;
    const content = text.trim();
    if (!socket || socket.readyState !== WebSocket.OPEN || !content) return false;

    ensureAudioContext();

    setMessages((prev) => [...prev, { role: "user", content }]);
    setPending(true);
    // Snapshot of what's currently on screen (active panel + its data, top
    // KPI strip, assistant state) — lets Claude answer questions about the
    // dashboard without the user reading it out loud.
    socket.send(
      JSON.stringify({
        conversationId: conversationIdRef.current,
        message: content,
        uiContext: getUIContext(),
      })
    );
    console.log("[voice] message sent", content);
    return true;
  }

  /** Speaks fixed text via the browser's own voice, bypassing Claude and any
   * backend round-trip entirely — used for instant local voice-command
   * confirmations. onAudioStart (optional) fires once speech actually starts. */
  async function speakText(text: string, onAudioStart?: () => void) {
    ensureAudioContext();
    setMessages((prev) => [...prev, { role: "assistant", content: text }]);
    if (!voiceEnabledRef.current) return;
    enqueueSpeech(text, onAudioStart);
  }

  /** Immediately silences whatever Jarvis is saying (queued or currently
   * speaking) — used when the user presses the mic to interrupt mid-reply.
   * Never restarts speech on its own; the caller decides what happens next
   * (typically: start listening). */
  function interruptSpeech() {
    utteranceGenerationRef.current += 1; // invalidate in-flight callbacks
    window.speechSynthesis.cancel();
    activeAudioRef.current?.pause();
    activeAudioRef.current = null;
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    audioLevelRef.current = 0;
    setSpeaking(false);
  }

  return {
    messages,
    connected,
    pending,
    speaking,
    voiceEnabled,
    setVoiceEnabled,
    audioLevelRef,
    sendMessage,
    speakText,
    interruptSpeech,
    ensureAudioContext,
    onBeforeSpeech: (fn: (() => Promise<void>) | undefined) => {
      beforeSpeechRef.current = fn;
    },
    onAssistantText: (fn: (text: string) => void) => {
      onAssistantTextRef.current = fn;
    },
  };
}
