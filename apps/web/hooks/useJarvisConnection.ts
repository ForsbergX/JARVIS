"use client";

import { useEffect, useRef, useState } from "react";
import { loadVoices, pickDarkMaleVoice } from "@/lib/fallbackVoice";

export interface JarvisMessage {
  role: "user" | "assistant";
  content: string;
  audioUrl?: string;
}

const WS_URL = process.env.NEXT_PUBLIC_JARVIS_WS_URL ?? "ws://localhost:4000/ws";

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

  useEffect(() => {
    voiceEnabledRef.current = voiceEnabled;
  }, [voiceEnabled]);

  useEffect(() => {
    const socket = new WebSocket(WS_URL);
    socketRef.current = socket;

    socket.onopen = () => setConnected(true);
    socket.onclose = () => setConnected(false);
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

    return () => socket.close();
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
    const audioCtx = audioCtxRef.current;
    const audio = new Audio(audioUrl);

    if (!audioCtx) {
      // No AudioContext yet (couldn't create one on the last user gesture) —
      // still play the voice, just without driving the brain's pulse.
      audio.play().then(() => onStart?.()).catch(onEnded);
      audio.onended = onEnded;
      return;
    }

    const source = audioCtx.createMediaElementSource(audio);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    const data = new Uint8Array(analyser.frequencyBinCount);
    source.connect(analyser);
    analyser.connect(audioCtx.destination);

    function tick() {
      analyser.getByteFrequencyData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i];
      audioLevelRef.current = sum / data.length / 255;
      if (!audio.paused && !audio.ended) requestAnimationFrame(tick);
    }

    audio.play().then(() => {
      onStart?.();
      tick();
    }).catch(onEnded);
    audio.onended = onEnded;
  }

  /** Jarvis's primary voice: the browser's own TTS, tuned dark/calm/
   * robotic-ish via a low pitch and rate on the darkest available male
   * voice (Swedish preferred, British English otherwise — see
   * lib/fallbackVoice.ts). Since speechSynthesis exposes no audio stream to
   * analyse, the brain's pulse is faked with a smooth oscillation for the
   * utterance's duration instead of sitting still. */
  async function playFallbackSpeech(text: string, onEnded: () => void, onStart?: () => void) {
    if (!("speechSynthesis" in window)) {
      onEnded();
      return;
    }

    const voices = await loadVoices();
    const voice = pickDarkMaleVoice(voices);

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = voice?.lang ?? "sv-SE";
    utterance.pitch = 0.5;
    utterance.rate = 0.9;
    utterance.volume = 1;
    if (voice) utterance.voice = voice;

    let pulseFrame = 0;
    let active = true;
    function pulse() {
      if (!active) return;
      pulseFrame += 1;
      audioLevelRef.current = 0.28 + 0.22 * Math.abs(Math.sin(pulseFrame * 0.12));
      requestAnimationFrame(pulse);
    }

    const finish = () => {
      active = false;
      onEnded();
    };

    utterance.onstart = () => {
      onStart?.();
      pulse();
    };
    utterance.onend = finish;
    utterance.onerror = finish;

    window.speechSynthesis.speak(utterance);
  }

  function sendMessage(text: string) {
    const socket = socketRef.current;
    const content = text.trim();
    if (!socket || socket.readyState !== WebSocket.OPEN || !content) return;

    ensureAudioContext();

    setMessages((prev) => [...prev, { role: "user", content }]);
    setPending(true);
    socket.send(
      JSON.stringify({ conversationId: conversationIdRef.current, message: content })
    );
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
    ensureAudioContext,
    onAssistantText: (fn: (text: string) => void) => {
      onAssistantTextRef.current = fn;
    },
  };
}
