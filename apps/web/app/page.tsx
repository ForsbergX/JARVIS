"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

const AlienOrb = dynamic(
  () => import("@/components/orb/AlienOrb").then((m) => m.AlienOrb),
  { ssr: false }
);

interface Message {
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

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [connected, setConnected] = useState(false);
  const [pending, setPending] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const socketRef = useRef<WebSocket | null>(null);
  const conversationIdRef = useRef<string | undefined>(undefined);
  const voiceEnabledRef = useRef(voiceEnabled);
  const audioLevelRef = useRef(0);
  const audioCtxRef = useRef<AudioContext | null>(null);

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

  function playWithVisualization(audioUrl: string) {
    const audioCtx = audioCtxRef.current;
    const audio = new Audio(audioUrl);

    if (!audioCtx) {
      // No AudioContext yet (couldn't create one on the last user gesture) —
      // still play the voice, just without driving the orb's pulse.
      audio.play().catch(() => {});
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
      else audioLevelRef.current = 0;
    }

    audio.play().then(tick).catch(() => {
      audioLevelRef.current = 0;
    });
    audio.onended = () => {
      audioLevelRef.current = 0;
    };
  }

  function sendMessage() {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN || !input.trim()) return;

    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext ?? (window as any).webkitAudioContext;
      audioCtxRef.current = new AudioCtx();
    }
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }

    const content = input.trim();
    setMessages((prev) => [...prev, { role: "user", content }]);
    setInput("");
    setPending(true);
    socket.send(
      JSON.stringify({ conversationId: conversationIdRef.current, message: content })
    );
  }

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>
      <h1>JARVIS</h1>
      <div style={{ width: 220, height: 220, margin: "0 auto" }}>
        <AlienOrb
          color="#5b21b6"
          glowColor="#a78bfa"
          size={1.4}
          audioLevelRef={audioLevelRef}
        />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p style={{ color: connected ? "green" : "crimson" }}>
          {connected ? "connected" : "disconnected"}
        </p>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14 }}>
          <input
            type="checkbox"
            checked={voiceEnabled}
            onChange={(e) => setVoiceEnabled(e.target.checked)}
          />
          🔊 Läs upp svar
        </label>
      </div>
      <div
        style={{
          border: "1px solid #ccc",
          borderRadius: 8,
          padding: 16,
          minHeight: 320,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {messages.map((message, index) => (
          <div key={index}>
            <strong>{message.role === "user" ? "You" : "JARVIS"}:</strong>{" "}
            {message.content}
            {message.audioUrl && (
              <audio
                controls
                src={message.audioUrl}
                style={{ display: "block", height: 28, marginTop: 4 }}
              />
            )}
          </div>
        ))}
        {pending && <div style={{ color: "#888" }}>JARVIS is thinking…</div>}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Say something to JARVIS"
          style={{ flex: 1, padding: 8 }}
        />
        <button onClick={sendMessage} disabled={!connected}>
          Send
        </button>
      </div>
    </main>
  );
}
