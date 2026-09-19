"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { loadVoices, pickDarkMaleVoice, stripMarkdownForSpeech } from "@/lib/fallbackVoice";

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
  const [listening, setListening] = useState(false);
  const [micSupported, setMicSupported] = useState(true);
  const socketRef = useRef<WebSocket | null>(null);
  const conversationIdRef = useRef<string | undefined>(undefined);
  const voiceEnabledRef = useRef(voiceEnabled);
  const audioLevelRef = useRef(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const recognitionRef = useRef<any>(null);
  const audioQueueRef = useRef<Array<{ kind: "clip" | "speech"; value: string }>>([]);
  const isPlayingRef = useRef(false);

  useEffect(() => {
    voiceEnabledRef.current = voiceEnabled;
  }, [voiceEnabled]);

  useEffect(() => {
    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    setMicSupported(Boolean(SpeechRecognitionCtor));
  }, []);

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
        if (!voiceEnabledRef.current) {
          // no-op
        } else if (data.audio && data.audioType) {
          enqueueClip(decodeAudio(data.audio, data.audioType));
        } else if (data.text) {
          enqueueSpeech(data.text);
        }
      } else if (data.type === "message") {
        setPending(false);
        setMessages((prev) => [...prev, { role: "assistant", content: data.content }]);
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

  // Sequential playback queue — streamed reply sentences arrive as separate
  // chunks, so they're queued and played one after another, never overlapping.
  function enqueueClip(audioUrl: string) {
    audioQueueRef.current.push({ kind: "clip", value: audioUrl });
    if (!isPlayingRef.current) playNextInQueue();
  }

  function enqueueSpeech(text: string) {
    audioQueueRef.current.push({ kind: "speech", value: text });
    if (!isPlayingRef.current) playNextInQueue();
  }

  function playNextInQueue() {
    const next = audioQueueRef.current.shift();
    if (!next) {
      isPlayingRef.current = false;
      audioLevelRef.current = 0;
      return;
    }
    isPlayingRef.current = true;
    if (next.kind === "clip") {
      playWithVisualization(next.value, playNextInQueue);
    } else {
      playFallbackSpeech(next.value, playNextInQueue);
    }
  }

  function playWithVisualization(audioUrl: string, onEnded: () => void) {
    const audioCtx = audioCtxRef.current;
    const audio = new Audio(audioUrl);

    if (!audioCtx) {
      // No AudioContext yet (couldn't create one on the last user gesture) —
      // still play the voice, just without driving the orb's pulse.
      audio.play().catch(onEnded);
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

    audio.play().then(tick).catch(onEnded);
    audio.onended = onEnded;
  }

  // Free, offline fallback when ElevenLabs has no credits or rejects the
  // voice (402/quota) — the browser's own TTS, tuned dark/calm/robotic-ish
  // via lowered pitch and rate, with a faked pulse driving the orb since
  // speechSynthesis exposes no audio stream to analyse.
  async function playFallbackSpeech(text: string, onEnded: () => void) {
    if (!("speechSynthesis" in window)) {
      onEnded();
      return;
    }
    const voices = await loadVoices();
    const voice = pickDarkMaleVoice(voices);

    const utterance = new SpeechSynthesisUtterance(stripMarkdownForSpeech(text));
    utterance.lang = voice?.lang ?? "sv-SE";
    utterance.pitch = 0.5;
    utterance.rate = 0.9;
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
    utterance.onstart = pulse;
    utterance.onend = finish;
    utterance.onerror = finish;
    window.speechSynthesis.speak(utterance);
  }

  function sendMessage(overrideText?: string) {
    const socket = socketRef.current;
    const content = (overrideText ?? input).trim();
    if (!socket || socket.readyState !== WebSocket.OPEN || !content) return;

    ensureAudioContext();

    setMessages((prev) => [...prev, { role: "user", content }]);
    setInput("");
    setPending(true);
    socket.send(
      JSON.stringify({ conversationId: conversationIdRef.current, message: content })
    );
  }

  function toggleListening() {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }

    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      setMicSupported(false);
      return;
    }

    ensureAudioContext();

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "sv-SE";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      sendMessage(transcript);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }

  return (
    <main className="chat-command" style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>
      <h1>JARVIS <span>COMMAND INTERFACE</span></h1>
      <div style={{ width: 220, height: 220, margin: "0 auto" }}>
        <AlienOrb
          color="#7a0018"
          glowColor="#ff163d"
          size={1.4}
          audioLevelRef={audioLevelRef}
        />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p className={connected ? "connection-status online" : "connection-status"} style={{ color: connected ? "#f4f4f6" : "#ff536e" }}>
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
          border: "1px solid rgba(255,22,61,0.28)", background: "rgba(7,7,9,0.82)", backdropFilter: "blur(10px)",
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
        {pending && <div style={{ color: "#b8b8c2" }}>JARVIS is thinking…</div>}
      </div>
      {!micSupported && (
        <p style={{ color: "#ff879a", fontSize: 13, marginTop: 8 }}>
          Röstinmatning stöds inte i den här webbläsaren — använd Chrome eller Edge.
        </p>
      )}
      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <button
          aria-pressed={listening}
          onClick={toggleListening}
          disabled={!connected || !micSupported}
          style={{
            background: listening ? "#7a0018" : undefined,
            color: listening ? "white" : undefined,
          }}
          title={listening ? "Sluta lyssna" : "Prata med JARVIS"}
        >
          {listening ? "🔴 Lyssnar…" : "🎤"}
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Say something to JARVIS"
          style={{ flex: 1, padding: 8 }}
        />
        <button onClick={() => sendMessage()} disabled={!connected}>
          Send
        </button>
      </div>
    </main>
  );
}
