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
  /** Position among the dormant cards — used only for the small-screen grid. */
  index: number;
}

// Wider than the usual 768px breakpoint: at the enlarged card size, the
// five-card fan-out would start overlapping itself below ~1100px wide, so
// the non-overlapping grid takes over earlier than usual.
const SMALL_SCREEN_QUERY = "(max-width: 1100px)";
const MOBILE_GRID_COLUMNS = 2;

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

export function HologramPanel({ panel, active, dimmed, onSelect, index }: HologramPanelProps) {
  const isSmallScreen = useIsSmallScreen();

  // Dormant cards sit at a fixed grid position on small screens (mustn't
  // overlap each other or crowd the orb/status), instead of the percentage
  // fan-out used on desktop.
  const row = Math.floor(index / MOBILE_GRID_COLUMNS);
  const col = index % MOBILE_GRID_COLUMNS;
  const mobileLeft = `${((col + 0.5) / MOBILE_GRID_COLUMNS) * 100}%`;
  const mobileTop = `${64 + row * 11}%`;

  const dormantLeft = isSmallScreen ? mobileLeft : `${50 + panel.slotX * 34}%`;
  const dormantTop = isSmallScreen ? mobileTop : "82%";
  const dormantRotateY = isSmallScreen ? 0 : panel.slotX * -14;
  // Kept much closer to full size than the old 0.42/0.5 (which made text
  // barely legible) — bounded by not overlapping the next card at the
  // width where the fan-out layout is still active (see SMALL_SCREEN_QUERY).
  const dormantScale = dimmed ? 0.62 : 0.75;

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
              x: "-50%",
              y: "-50%",
              scale: 1,
              opacity: 1,
              rotateY: 0,
              filter: "blur(0px)",
              zIndex: 20,
            }
          : {
              left: dormantLeft,
              top: dormantTop,
              width: "clamp(180px, 12vw, 220px)",
              x: "-50%",
              y: "-50%",
              scale: dormantScale,
              opacity: dimmed ? 0.25 : 0.55,
              rotateY: dormantRotateY,
              filter: dimmed ? "blur(4px)" : "blur(1.5px)",
              zIndex: 5,
            }
      }
      whileHover={
        active
          ? undefined
          : {
              opacity: 0.95,
              scale: dormantScale + 0.06,
              filter: "blur(0px)",
            }
      }
      transition={{ type: "spring", stiffness: 120, damping: 18, mass: 0.9 }}
      style={{
        position: "absolute",
        // x/y/scale/rotateY above are Framer's own motion values — it fully
        // owns the composed `transform` once any of those are animated, so
        // the center-point anchoring lives there, not in a static
        // style.transform string (Framer would silently discard that).
        transformStyle: "preserve-3d",
        cursor: active ? "default" : "pointer",
        boxSizing: "border-box",
        background: eiraTokens.panelBackground,
        border: active
          ? `1px solid ${eiraTokens.panelBorder}`
          : `1.5px solid ${dimmed ? "rgba(192, 132, 252, 0.28)" : "rgba(192, 132, 252, 0.5)"}`,
        borderRadius: 14,
        padding: active ? 24 : 20,
        minHeight: active ? undefined : 82,
        color: eiraTokens.energyWhite,
        fontFamily: "system-ui, sans-serif",
        backdropFilter: "blur(10px)",
        boxShadow: active
          ? `0 0 40px ${eiraTokens.violetPrimary}55, inset 0 0 1px ${eiraTokens.violetBright}`
          : dimmed
            ? "none"
            : `0 0 16px ${eiraTokens.violetPrimary}40, 0 0 6px ${eiraTokens.cyanAccent}30, inset 0 0 10px rgba(103, 232, 249, 0.06)`,
        pointerEvents: "auto",
      }}
    >
      <div
        style={{
          fontSize: active ? 13 : 14,
          letterSpacing: 1.5,
          textTransform: "uppercase",
          color: eiraTokens.violetBright,
          marginBottom: active ? 16 : 6,
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
        <div style={{ fontSize: 12.5, opacity: 0.7, lineHeight: 1.4 }}>{panel.subtitle}</div>
      )}
    </motion.div>
  );
}
