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

export function EiraExperience() {
  const [webglAvailable, setWebglAvailable] = useState(true);
  const { audioLevelRef, needsActivation, activateHandsFree, handleOrbInterrupt } = useVoiceCommands();
  const eiraState = useEiraStore((s) => s.state);

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
      {webglAvailable ? (
        <SceneErrorBoundary fallback={<FallbackBrain />}>
          <EiraScene audioLevelRef={audioLevelRef} />
        </SceneErrorBoundary>
      ) : (
        <FallbackBrain />
      )}

      {/* Click-the-orb interrupt: a plain DOM hit-zone over roughly where
          the orb sits (no Three.js file touched). Only interactive while
          Jarvis is talking, so it never blocks clicks on panels/cards. */}
      <div
        onClick={handleOrbInterrupt}
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "38vmin",
          height: "38vmin",
          borderRadius: "50%",
          pointerEvents: eiraState === "speaking" ? "auto" : "none",
          cursor: eiraState === "speaking" ? "pointer" : "default",
          zIndex: 10,
        }}
      />

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
          opacity: 0.85,
          pointerEvents: "none",
        }}
      >
        JARVIS
      </div>

      <div style={{ position: "absolute", top: "5%", left: "4%", pointerEvents: "none" }}>
        <SystemStatus />
      </div>

      <PanelStage />

      <CommandInterface needsActivation={needsActivation} onActivate={activateHandsFree} />
    </main>
  );
}
