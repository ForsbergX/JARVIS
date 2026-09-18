"use client";

import { useEiraStore } from "@/store/useEiraStore";
import { eiraTokens } from "@/lib/eiraTokens";

const STATE_LABEL: Record<string, string> = {
  idle: "VILAR",
  listening: "LYSSNAR",
  thinking: "ANALYSERAR",
  speaking: "TALAR",
  executing: "AKTIVERAR",
  success: "KLART",
  error: "STÖRNING",
};

const STATE_COLOR: Record<string, string> = {
  idle: eiraTokens.violetPrimary,
  listening: eiraTokens.cyanAccent,
  thinking: eiraTokens.violetBright,
  speaking: eiraTokens.energyWhite,
  executing: eiraTokens.violetBright,
  success: eiraTokens.success,
  error: eiraTokens.danger,
};

export function VoiceStatus() {
  const state = useEiraStore((s) => s.state);
  const micSupported = useEiraStore((s) => s.micSupported);
  const color = STATE_COLOR[state];

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "system-ui, sans-serif" }}>
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: color,
          boxShadow: `0 0 8px ${color}`,
        }}
      />
      <span style={{ fontSize: 11, letterSpacing: 1.5, color, opacity: 0.9 }}>
        {STATE_LABEL[state]}
      </span>
      {!micSupported && (
        <span style={{ fontSize: 11, color: eiraTokens.warning, opacity: 0.8 }}>
          · mikrofon ej tillgänglig
        </span>
      )}
    </div>
  );
}
