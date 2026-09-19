"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useVoiceCommands } from "@/hooks/useVoiceCommands";
import { useEiraStore } from "@/store/useEiraStore";
import { eiraTokens } from "@/lib/eiraTokens";
import { PanelStage } from "./PanelStage";
import { CommandInterface } from "./CommandInterface";
import { SystemStatus } from "./SystemStatus";
import { SceneErrorBoundary } from "./SceneErrorBoundary";
import { FallbackBrain } from "./FallbackBrain";

const EiraScene = dynamic(() => import("./EiraScene").then((m) => m.EiraScene), {
  ssr: false,
});

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}

// Same "is this a phone-sized viewport" breakpoint the Google Ads/Finance
// panels already use for their own mobile layout, kept in sync so the
// mini-orb switch and those panels' full-width takeover happen together.
const MOBILE_QUERY = "(max-width: 768px)";

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY);
    setIsMobile(mql.matches);
    const onChange = (event: MediaQueryListEvent) => setIsMobile(event.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}

export function EiraExperience() {
  const [webglAvailable, setWebglAvailable] = useState(true);
  const { audioLevelRef, needsActivation, activateHandsFree, handleOrbInterrupt } = useVoiceCommands();
  const eiraState = useEiraStore((s) => s.state);
  const activePanel = useEiraStore((s) => s.activePanel);
  const isMobile = useIsMobile();
  // On a phone, an open panel takes over ~90% of the screen (see
  // HologramPanel/GoogleAdsPanel/FinancePanel mobile sizing) — leaving the
  // orb full-screen behind it just means it's fully hidden anyway, so it
  // shrinks into a small picture-in-picture bubble in the corner instead of
  // silently disappearing. Desktop is unaffected: the orb stays full-screen
  // there since the panel only ever covers part of it.
  const orbAsMiniPip = isMobile && activePanel !== null;
  // All three panel types cap out at maxHeight: 75vh on mobile, so in the
  // worst case (content that tall) a centered panel's own top edge sits at
  // 12.5% of the viewport. The pip has to fully fit above that line or it
  // ends up sitting on top of the panel's own close button (confirmed with
  // the Ekonomi/Google Ads panels, whose close button is top-right too) —
  // so it's kept deliberately small rather than matched to the desktop
  // orb's proportions.
  const MINI_PIP_TOP = "1%";
  const MINI_PIP_RIGHT = "4%";
  const MINI_PIP_SIZE = "clamp(44px, 12vw, 56px)";

  useEffect(() => {
    setWebglAvailable(hasWebGL());
  }, []);

  return (
    <main className="command-experience"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: eiraTokens.background,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: orbAsMiniPip ? "auto" : 0,
          top: orbAsMiniPip ? MINI_PIP_TOP : 0,
          right: orbAsMiniPip ? MINI_PIP_RIGHT : 0,
          width: orbAsMiniPip ? MINI_PIP_SIZE : "100%",
          height: orbAsMiniPip ? MINI_PIP_SIZE : "100%",
          borderRadius: orbAsMiniPip ? "50%" : 0,
          overflow: "hidden",
          border: orbAsMiniPip ? `1px solid ${eiraTokens.panelBorder}` : "none",
          boxShadow: orbAsMiniPip ? `0 0 24px ${eiraTokens.accentPrimary}40` : "none",
          background: orbAsMiniPip ? eiraTokens.background : "transparent",
          transition: "all 0.4s ease",
          zIndex: orbAsMiniPip ? 26 : 0,
          pointerEvents: "none",
        }}
      >
        {webglAvailable ? (
          <SceneErrorBoundary fallback={<FallbackBrain />}>
            <EiraScene audioLevelRef={audioLevelRef} />
          </SceneErrorBoundary>
        ) : (
          <FallbackBrain />
        )}
      </div>

      {/* Click-the-orb interrupt: a plain DOM hit-zone over roughly where
          the orb sits (no Three.js file touched). Only interactive while
          Jarvis is talking, so it never blocks clicks on panels/cards. When
          the orb is the mini corner bubble, the hit-zone follows it there
          instead of sitting uselessly over empty center-screen space. */}
      <div
        onClick={handleOrbInterrupt}
        style={{
          position: "absolute",
          top: orbAsMiniPip ? MINI_PIP_TOP : "50%",
          left: orbAsMiniPip ? "auto" : "50%",
          right: orbAsMiniPip ? MINI_PIP_RIGHT : "auto",
          transform: orbAsMiniPip ? "none" : "translate(-50%, -50%)",
          width: orbAsMiniPip ? MINI_PIP_SIZE : "38vmin",
          height: orbAsMiniPip ? MINI_PIP_SIZE : "38vmin",
          borderRadius: "50%",
          pointerEvents: eiraState === "speaking" ? "auto" : "none",
          cursor: eiraState === "speaking" ? "pointer" : "default",
          zIndex: orbAsMiniPip ? 27 : 10,
        }}
      />

      {/* Fades out with the mini-pip switch instead of cluttering the
          already-full-screen mobile panel behind it; unchanged on desktop. */}
      <div
        style={{
          position: "absolute",
          top: "5%",
          left: "50%",
          transform: "translateX(-50%)",
          fontFamily: "var(--font-command)",
          fontSize: 13,
          letterSpacing: 4,
          color: eiraTokens.accentBright,
          opacity: orbAsMiniPip ? 0 : 0.85,
          transition: "opacity 0.3s ease",
          pointerEvents: "none",
        }}
      >
        JARVIS
      </div>

      <div
        style={{
          position: "absolute",
          top: "5%",
          left: "4%",
          opacity: orbAsMiniPip ? 0 : 1,
          transition: "opacity 0.3s ease",
          pointerEvents: "none",
        }}
      >
        <SystemStatus />
      </div>

      <PanelStage />

      <CommandInterface needsActivation={needsActivation} onActivate={activateHandsFree} />
    </main>
  );
}
