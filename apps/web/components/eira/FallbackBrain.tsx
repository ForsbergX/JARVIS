"use client";

import { eiraTokens } from "@/lib/eiraTokens";

/** Pure CSS/SVG stand-in for the 3D brain, used when WebGL is unavailable
 * or the 3D scene throws — keeps the experience usable, never a blank page. */
export function FallbackBrain() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          width: 260,
          height: 260,
          borderRadius: "50%",
          background: `radial-gradient(circle at 40% 35%, ${eiraTokens.energyWhite}, ${eiraTokens.violetBright} 35%, ${eiraTokens.violetPrimary} 60%, transparent 75%)`,
          boxShadow: `0 0 90px ${eiraTokens.violetPrimary}88`,
          animation: "eira-fallback-pulse 3.4s ease-in-out infinite",
        }}
      />
      <style>{`
        @keyframes eira-fallback-pulse {
          0%, 100% { transform: scale(1); opacity: 0.85; }
          50% { transform: scale(1.06); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
