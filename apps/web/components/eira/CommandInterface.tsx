"use client";

import { eiraTokens } from "@/lib/eiraTokens";
import { VoiceStatus } from "./VoiceStatus";

interface CommandInterfaceProps {
  /** True only until hands-free listening starts successfully for the
   * first time (the browser blocked the automatic start and needs a real
   * user gesture) — once it fires, this is false for the rest of the
   * session and never shown again. */
  needsActivation: boolean;
  onActivate: () => void;
}

export function CommandInterface({ needsActivation, onActivate }: CommandInterfaceProps) {
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
      {needsActivation ? (
        <button
          type="button"
          onClick={onActivate}
          style={{
            background: "rgba(8, 3, 18, 0.7)",
            border: `1px solid ${eiraTokens.violetBright}`,
            color: eiraTokens.violetBright,
            borderRadius: 999,
            padding: "10px 22px",
            fontSize: 12,
            letterSpacing: 2,
            fontFamily: "system-ui, sans-serif",
            cursor: "pointer",
            boxShadow: `0 0 16px ${eiraTokens.violetPrimary}55`,
          }}
        >
          AKTIVERA JARVIS
        </button>
      ) : (
        <VoiceStatus />
      )}
    </div>
  );
}
