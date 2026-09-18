"use client";

import { useEffect, useRef, useState } from "react";

export interface JarvisMessage {
  role: "user" | "assistant";
  content: string;
  audioUrl?: string;
}

const WS_URL = process.env.NEXT_PUBLIC_JARVIS_WS_URL ?? "ws://localhost:4000/ws";
const API_URL = process.env.NEXT_PUBLIC_JARVIS_API_URL ?? "http://localhost:4000";

function decodeAudio(base64: string, contentType: string): string {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: contentType });
  return URL.createObjectURL(blob);
}

/**
 * Owns the WebSocket connection to the JARVIS backend, the Claude chat
 * round-trip, and ElevenLabs audio playback + live amplitude analysis.
 * Kept UI-agnostic so both the plain chat page and the Eira experience
 * can share the exact same working connection.
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
      } else if (data.type === "message") {
        setPending(false);
        const audioUrl =
          data.audio && data.audioType ? decodeAudio(data.audio, data.audioType) : undefined;
        setMessages((prev) => [...prev, { role: "assistant", content: data.content, audioUrl }]);
        onAssistantTextRef.current?.(data.content);
        if (audioUrl && voiceEnabledRef.current) {
          playWithVisualization(audioUrl);
        }
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

  function playWithVisualization(audioUrl: string) {
    const audioCtx = audioCtxRef.current;
    const audio = new Audio(audioUrl);

    setSpeaking(true);
    const finish = () => {
      audioLevelRef.current = 0;
      setSpeaking(false);
    };

    if (!audioCtx) {
      // No AudioContext yet (couldn't create one on the last user gesture) —
      // still play the voice, just without driving the brain's pulse.
      audio.play().catch(finish);
      audio.onended = finish;
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
      else finish();
    }

    audio.play().then(tick).catch(finish);
    audio.onended = finish;
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

  /** Speaks fixed text via the backend's /speak endpoint, bypassing Claude
   * entirely — used for instant local voice-command confirmations. */
  async function speakText(text: string) {
    ensureAudioContext();
    setMessages((prev) => [...prev, { role: "assistant", content: text }]);
    if (!voiceEnabledRef.current) return;
    try {
      const res = await fetch(`${API_URL}/speak`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (data.audio && data.audioType) {
        playWithVisualization(decodeAudio(data.audio, data.audioType));
      }
    } catch {
      // Text confirmation already shown; voice is best-effort.
    }
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
