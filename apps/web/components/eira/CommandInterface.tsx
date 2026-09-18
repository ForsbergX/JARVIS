"use client";

import { VoiceStatus } from "./VoiceStatus";

/**
 * Hands-free: no mic button. Listening starts and restarts on its own
 * (see useVoiceCommands) — this just surfaces the current state.
 */
export function CommandInterface() {
  return (
    <div
      style={{
        position: "absolute",
        bottom: "6%",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 30,
      }}
    >
      <VoiceStatus />
    </div>
  );
}
