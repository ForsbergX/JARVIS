"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useVoiceCommands } from "@/hooks/useVoiceCommands";
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
  const { audioLevelRef } = useVoiceCommands();

  useEffect(() => {
    setWebglAvailable(hasWebGL());
  }, []);

  return (
    <main
      style={{
        position: "fixed",
        inset: 0,
        background: `radial-gradient(circle at 50% 40%, ${eiraTokens.backgroundSecondary} 0%, ${eiraTokens.background} 70%)`,
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

      <div
        style={{
          position: "absolute",
          top: "5%",
          left: "50%",
          transform: "translateX(-50%)",
          fontFamily: "system-ui, sans-serif",
          fontSize: 13,
          letterSpacing: 4,
          color: eiraTokens.violetBright,
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

      <CommandInterface />
    </main>
  );
}
