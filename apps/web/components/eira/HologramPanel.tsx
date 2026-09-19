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
  // fan-out used on desktop. 11% row spacing was sized for the OLD, smaller
  // cards — at the current min-height (88px desktop / ~70px mobile) that's
  // far too tight and rows visually collide (confirmed on a 414x560
  // viewport). 16% row spacing fixes the card-to-card overlap, but with a
  // 55% start the third row's center still lands under the fixed
  // bottom:6% "AKTIVERA JARVIS"/VoiceStatus control (confirmed on the same
  // viewport) — starting at 48% shifts all three rows up enough to clear it.
  const row = Math.floor(index / MOBILE_GRID_COLUMNS);
  const col = index % MOBILE_GRID_COLUMNS;
  const mobileLeft = `${((col + 0.5) / MOBILE_GRID_COLUMNS) * 100}%`;
  const mobileTop = `${48 + row * 14}%`;

  const dormantLeft = isSmallScreen ? mobileLeft : `${50 + panel.slotX * 34}%`;
  const dormantTop = isSmallScreen ? mobileTop : "82%";
  const dormantRotateY = isSmallScreen ? 0 : panel.slotX * -14;
  // No shrink: width/min-height/font-sizes below are meant to be the true
  // rendered sizes, not something further reduced by a scale transform —
  // that compounding (small base size * scale) is what made the cards
  // unreadable before. The dormant/active distinction on hover is a small
  // scale nudge, not a resting-state one.
  const dormantScale = 1;
  // Dimmed (another panel is open) is conveyed via background/border alpha
  // only, never via the card's own opacity — the whole card, including its
  // text, must stay at >=0.92 opacity at all times per spec.
  const dormantBackground = dimmed ? "rgba(7, 7, 9, 0.68)" : "rgba(7, 7, 9, 0.85)";
  const dormantBorderColor = dimmed ? "rgba(255, 22, 61, 0.32)" : "rgba(255, 22, 61, 0.55)";
  // Desktop keeps the exact spec'd sizing (88px / 16px 18px / 14 / 12.5).
  // Mobile is deliberately more compact — three rows of two columns need to
  // fit above the mic status without colliding, which the full desktop
  // size doesn't leave room for on shorter phone viewports.
  const dormantMinHeight = isSmallScreen ? 68 : 88;
  const dormantPadding = isSmallScreen ? "10px 12px" : "16px 18px";
  const dormantTitleSize = isSmallScreen ? 13 : 14;
  const dormantSubtitleSize = isSmallScreen ? 11.5 : 12.5;
  // The open/active state had no mobile sizing at all before — it used the
  // desktop "min(46vw, 620px)" box on every screen, which is ~190px wide on
  // a 414px phone. Sized to match the GoogleAds/Finance dedicated panels'
  // own mobile treatment (92vw, 75vh scroll cap) so all five tabs feel
  // consistent when opened on a phone.
  // Centered on every screen size — previously 58% on desktop, which (along
  // with the orb's own camera offset, since removed in EiraScene) pushed
  // Eira toward the right edge instead of leaving her the focal point.
  const activeLeft = "50%";
  const activeWidth = isSmallScreen ? "92vw" : "min(46vw, 620px)";

  return (
    <motion.div className="hologram-panel" data-active={active}
      onClick={onSelect}
      initial={false}
      animate={
        active
          ? {
              left: activeLeft,
              top: "50%",
              width: activeWidth,
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
              width: "clamp(175px, 12vw, 220px)",
              x: "-50%",
              y: "-50%",
              scale: dormantScale,
              // >=0.92 at all times, even dimmed, ON DESKTOP — the "other
              // panel is open" cue lives in background/border alpha there
              // (see dormantBackground/dormantBorderColor), never opacity.
              // On mobile the active panel takes ~92vw/75vh of the screen
              // (see activeWidth above), so a dimmed card behind it has
              // nowhere to sit without peeking out from an edge — fully
              // hidden there instead of just dimmed.
              opacity: dimmed ? (isSmallScreen ? 0 : 0.92) : 1,
              rotateY: dormantRotateY,
              filter: "none",
              zIndex: 15,
            }
      }
      whileHover={
        active
          ? undefined
          : {
              opacity: 1,
              scale: dormantScale + 0.04,
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
        background: active ? eiraTokens.panelBackground : dormantBackground,
        border: active
          ? `1px solid ${eiraTokens.panelBorder}`
          : `1.5px solid ${dormantBorderColor}`,
        borderRadius: 6,
        padding: active ? 24 : dormantPadding,
        minHeight: active ? undefined : dormantMinHeight,
        maxHeight: active && isSmallScreen ? "75vh" : undefined,
        overflowY: active && isSmallScreen ? "auto" : undefined,
        color: eiraTokens.energyWhite,
        fontFamily: "var(--font-command)",
        backdropFilter: "blur(10px)",
        boxShadow: active
          ? `0 0 18px ${eiraTokens.accentPrimary}28, inset 0 0 1px ${eiraTokens.accentBright}`
          : `0 0 16px ${eiraTokens.accentPrimary}12, 0 0 6px ${eiraTokens.contrastAccent}30, inset 0 0 10px rgba(255, 22, 61, 0.06)`,
        pointerEvents: dimmed && isSmallScreen ? "none" : "auto",
      }}
    >
      <div
        style={{
          fontSize: active ? 13 : dormantTitleSize,
          letterSpacing: 1.5,
          textTransform: "uppercase",
          color: eiraTokens.accentBright,
          marginBottom: active ? 16 : 6,
          opacity: active ? 0.9 : 1,
        }}
      >
        {panel.label}
      </div>
      {active ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <PanelContent panel={panel.id} />
        </div>
      ) : (
        <div style={{ fontSize: dormantSubtitleSize, opacity: 0.85, lineHeight: 1.35, color: eiraTokens.energyWhite }}>
          {panel.subtitle}
        </div>
      )}
    </motion.div>
  );
}
