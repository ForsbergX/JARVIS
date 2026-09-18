"use client";

import { useEiraStore, type EiraState } from "@/store/useEiraStore";
import { eiraTokens } from "@/lib/eiraTokens";

type DisplayState = "idle" | "listening" | "thinking" | "speaking";

// Only four discrete labels are ever shown, regardless of the fuller
// internal state machine (executing/success/error render as one of these).
function toDisplayState(state: EiraState): DisplayState {
  if (state === "listening") return "listening";
  if (state === "thinking") return "thinking";
  if (state === "speaking" || state === "executing" || state === "success") return "speaking";
  return "idle";
}

const STATE_LABEL: Record<DisplayState, string> = {
  idle: "VILAR",
  listening: "LYSSNAR",
  thinking: "TÄNKER",
  speaking: "TALAR",
};

const STATE_COLOR: Record<DisplayState, string> = {
  idle: eiraTokens.violetPrimary,
  listening: eiraTokens.cyanAccent,
  thinking: eiraTokens.violetBright,
  speaking: eiraTokens.energyWhite,
};

export function VoiceStatus() {
  const state = useEiraStore((s) => s.state);
  const display = toDisplayState(state);
  const color = STATE_COLOR[display];

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
        {STATE_LABEL[display]}
      </span>
    </div>
  );
}
