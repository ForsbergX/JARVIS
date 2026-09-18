"use client";

import { useState } from "react";
import { eiraTokens } from "@/lib/eiraTokens";
import { useEiraStore } from "@/store/useEiraStore";
import { VoiceStatus } from "./VoiceStatus";

interface CommandInterfaceProps {
  connected: boolean;
  listening: boolean;
  micSupported: boolean;
  voiceEnabled: boolean;
  onToggleVoice: (enabled: boolean) => void;
  onToggleListen: () => void;
  onSubmitText: (text: string) => void;
}

export function CommandInterface({
  connected,
  listening,
  micSupported,
  voiceEnabled,
  onToggleVoice,
  onToggleListen,
  onSubmitText,
}: CommandInterfaceProps) {
  const [input, setInput] = useState("");
  const transcript = useEiraStore((s) => s.transcript);

  function submit() {
    if (!input.trim()) return;
    onSubmitText(input);
    setInput("");
  }

  return (
    <div
      style={{
        position: "absolute",
        bottom: "4%",
        left: "50%",
        transform: "translateX(-50%)",
        width: "min(90vw, 620px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        fontFamily: "system-ui, sans-serif",
        zIndex: 30,
      }}
    >
      {listening && transcript && (
        <div style={{ fontSize: 13, color: eiraTokens.cyanAccent, opacity: 0.85 }}>
          &ldquo;{transcript}&rdquo;
        </div>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          width: "100%",
          background: eiraTokens.panelBackground,
          border: `1px solid ${eiraTokens.panelBorder}`,
          borderRadius: 999,
          padding: "10px 10px 10px 20px",
          backdropFilter: "blur(12px)",
          boxShadow: `0 0 30px ${eiraTokens.violetDeep}66`,
        }}
      >
        <button
          onClick={onToggleListen}
          disabled={!connected || !micSupported}
          title={listening ? "Sluta lyssna" : "Prata med Eira"}
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            border: "none",
            flexShrink: 0,
            background: listening ? eiraTokens.danger : eiraTokens.violetPrimary,
            color: eiraTokens.energyWhite,
            fontSize: 16,
            cursor: micSupported ? "pointer" : "not-allowed",
            boxShadow: listening ? `0 0 16px ${eiraTokens.danger}` : `0 0 12px ${eiraTokens.violetPrimary}88`,
          }}
        >
          {listening ? "●" : "🎤"}
        </button>

        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Tala eller skriv till Eira…"
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            color: eiraTokens.energyWhite,
            fontSize: 14,
          }}
        />

        <button
          onClick={() => onToggleVoice(!voiceEnabled)}
          title={voiceEnabled ? "Stäng av röst" : "Slå på röst"}
          style={{
            background: "transparent",
            border: "none",
            color: voiceEnabled ? eiraTokens.violetBright : "rgba(255,255,255,0.35)",
            fontSize: 16,
            cursor: "pointer",
          }}
        >
          {voiceEnabled ? "🔊" : "🔇"}
        </button>

        <button
          onClick={submit}
          disabled={!connected}
          style={{
            background: eiraTokens.violetPrimary,
            border: "none",
            borderRadius: 999,
            color: eiraTokens.energyWhite,
            padding: "8px 18px",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Skicka
        </button>
      </div>

      <VoiceStatus />
    </div>
  );
}
