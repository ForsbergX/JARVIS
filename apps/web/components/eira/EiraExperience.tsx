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
  const {
    connected,
    listening,
    micSupported,
    voiceEnabled,
    setVoiceEnabled,
    toggleListening,
    submitText,
    audioLevelRef,
    messages,
    pending,
  } = useVoiceCommands();

  useEffect(() => {
    setWebglAvailable(hasWebGL());
  }, []);

  const lastAssistantMessage = [...messages].reverse().find((m) => m.role === "assistant");

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
          textAlign: "center",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            fontFamily: "system-ui, sans-serif",
            fontSize: 13,
            letterSpacing: 4,
            color: eiraTokens.violetBright,
            opacity: 0.85,
          }}
        >
          EIRA
        </div>
        {pending && (
          <div
            style={{
              fontFamily: "system-ui, sans-serif",
              fontSize: 11,
              letterSpacing: 2,
              color: eiraTokens.cyanAccent,
              marginTop: 4,
            }}
          >
            ANALYSERAR
          </div>
        )}
      </div>

      <div style={{ position: "absolute", top: "5%", left: "4%", pointerEvents: "none" }}>
        <SystemStatus />
      </div>

      {lastAssistantMessage && (
        <div
          style={{
            position: "absolute",
            bottom: "13%",
            left: "50%",
            transform: "translateX(-50%)",
            maxWidth: "min(80vw, 560px)",
            textAlign: "center",
            fontFamily: "system-ui, sans-serif",
            fontSize: 13,
            color: eiraTokens.energyWhite,
            opacity: 0.75,
            pointerEvents: "none",
          }}
        >
          {lastAssistantMessage.content}
        </div>
      )}

      <PanelStage />

      <CommandInterface
        connected={connected}
        listening={listening}
        micSupported={micSupported}
        voiceEnabled={voiceEnabled}
        onToggleVoice={setVoiceEnabled}
        onToggleListen={toggleListening}
        onSubmitText={submitText}
      />
    </main>
  );
}
