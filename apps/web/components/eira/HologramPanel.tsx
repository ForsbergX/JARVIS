"use client";

import { motion } from "motion/react";
import { eiraTokens } from "@/lib/eiraTokens";
import type { PanelLayoutEntry } from "./panelLayout";
import { PanelContent } from "./PanelContent";

interface HologramPanelProps {
  panel: PanelLayoutEntry;
  active: boolean;
  dimmed: boolean;
  onSelect: () => void;
}

export function HologramPanel({ panel, active, dimmed, onSelect }: HologramPanelProps) {
  return (
    <motion.div
      onClick={onSelect}
      initial={false}
      animate={
        active
          ? {
              left: "58%",
              top: "50%",
              width: "min(46vw, 620px)",
              scale: 1,
              opacity: 1,
              rotateY: 0,
              filter: "blur(0px)",
              zIndex: 20,
            }
          : {
              left: `${50 + panel.slotX * 34}%`,
              top: "82%",
              width: "220px",
              scale: dimmed ? 0.42 : 0.5,
              opacity: dimmed ? 0.25 : 0.55,
              rotateY: panel.slotX * -14,
              filter: dimmed ? "blur(4px)" : "blur(1.5px)",
              zIndex: 5,
            }
      }
      whileHover={active ? undefined : { opacity: 0.8, scale: 0.55 }}
      transition={{ type: "spring", stiffness: 120, damping: 18, mass: 0.9 }}
      style={{
        position: "absolute",
        transform: "translate(-50%, -50%)",
        transformStyle: "preserve-3d",
        cursor: active ? "default" : "pointer",
        background: eiraTokens.panelBackground,
        border: `1px solid ${eiraTokens.panelBorder}`,
        borderRadius: 14,
        padding: active ? 24 : 14,
        color: eiraTokens.energyWhite,
        fontFamily: "system-ui, sans-serif",
        backdropFilter: "blur(10px)",
        boxShadow: active
          ? `0 0 40px ${eiraTokens.violetPrimary}55, inset 0 0 1px ${eiraTokens.violetBright}`
          : "none",
        pointerEvents: "auto",
      }}
    >
      <div
        style={{
          fontSize: active ? 13 : 11,
          letterSpacing: 1.5,
          textTransform: "uppercase",
          color: eiraTokens.violetBright,
          marginBottom: active ? 16 : 4,
          opacity: 0.9,
        }}
      >
        {panel.label}
      </div>
      {active ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <PanelContent panel={panel.id} />
        </div>
      ) : (
        <div style={{ fontSize: 12, opacity: 0.6 }}>Säg &quot;öppna {panel.label.toLowerCase()}&quot;</div>
      )}
    </motion.div>
  );
}
