"use client";

import { VoiceStatus } from "./VoiceStatus";

interface CommandInterfaceProps {
  /** Pressing the status indicator starts listening, or — if Jarvis is
   * talking — interrupts him and starts listening immediately. No visible
   * button by design; this just makes the existing indicator clickable. */
  onMicPress?: () => void;
}

export function CommandInterface({ onMicPress }: CommandInterfaceProps) {
  return (
    <div
      onClick={onMicPress}
      style={{
        position: "absolute",
        bottom: "6%",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 30,
        cursor: onMicPress ? "pointer" : undefined,
      }}
    >
      <VoiceStatus />
    </div>
  );
}
