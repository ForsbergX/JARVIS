"use client";

import { useEffect, useState } from "react";
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

// Below this width there isn't room to dock the panel on the right and
// still keep the orb visible, so it centers itself instead (like the
// dormant tray items do) at ~92% of the screen width.
const SMALL_SCREEN_QUERY = "(max-width: 768px)";

function useIsSmallScreen(): boolean {
  const [isSmall, setIsSmall] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(SMALL_SCREEN_QUERY);
    setIsSmall(mql.matches);
    const onChange = (event: MediaQueryListEvent) => setIsSmall(event.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isSmall;
}

export function HologramPanel({ panel, active, dimmed, onSelect }: HologramPanelProps) {
  const isSmallScreen = useIsSmallScreen();

  return (
    <motion.div
      onClick={onSelect}
      initial={false}
      animate={
        active
          ? isSmallScreen
            ? {
                left: "50%",
                right: "auto",
                top: "50%",
                width: "92vw",
                x: "-50%",
                y: "-50%",
                scale: 1,
                opacity: 1,
                rotateY: 0,
                filter: "blur(0px)",
                zIndex: 20,
              }
            : {
                left: "auto",
                right: "4%",
                top: "50%",
                width: "clamp(620px, 42vw, 820px)",
                x: 0,
                y: "-50%",
                scale: 1,
                opacity: 1,
                rotateY: 0,
                filter: "blur(0px)",
                zIndex: 20,
              }
          : {
              left: `${50 + panel.slotX * 34}%`,
              right: "auto",
              top: "82%",
              width: "220px",
              x: "-50%",
              y: "-50%",
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
        // Padding must come out of the specified width/height, not add to
        // it — otherwise clamp(620px, 42vw, 820px) and 92vw both overflow
        // their intended bounds once the 32px active padding is added.
        boxSizing: "border-box",
        // x/y/scale/rotateY above are Framer's own motion values — it fully
        // owns the composed `transform` once any of those are animated, so
        // the center/right-edge anchoring lives there, not in a static
        // style.transform string (Framer would silently discard that).
        transformStyle: "preserve-3d",
        cursor: active ? "default" : "pointer",
        background: eiraTokens.panelBackground,
        border: `1px solid ${eiraTokens.panelBorder}`,
        borderRadius: 14,
        padding: active ? 32 : 14,
        minHeight: active ? 420 : undefined,
        maxHeight: active ? "72vh" : undefined,
        overflowY: active ? "auto" : undefined,
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
          fontSize: active ? 20 : 11,
          letterSpacing: 1.5,
          textTransform: "uppercase",
          color: eiraTokens.violetBright,
          marginBottom: active ? 24 : 4,
          opacity: 0.9,
        }}
      >
        {panel.label}
      </div>
      {active ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <PanelContent panel={panel.id} />
        </div>
      ) : (
        <div style={{ fontSize: 12, opacity: 0.6 }}>Säg &quot;öppna {panel.label.toLowerCase()}&quot;</div>
      )}
    </motion.div>
  );
}
