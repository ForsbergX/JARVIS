"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";

import { OrbCore } from "./OrbCore";
import { OrbRings } from "./OrbRings";
import { OrbParticles } from "./OrbParticles";

export interface AlienOrbProps {
  color?: string;
  glowColor?: string;
  size?: number;
  interactive?: boolean;
  className?: string;
  /** 0–1 live voice amplitude; when provided, the orb pulses with it while keeping its look. */
  audioLevelRef?: React.RefObject<number>;
}

export function AlienOrb({
  color = "#7a0018",
  glowColor = "#ff163d",
  size = 1.4,
  interactive = true,
  className,
  audioLevelRef,
}: AlienOrbProps) {


  return (
    <div className={className} style={{ width: "100%", height: "100%" }}>
      <Canvas
        camera={{ position: [0, 0, 5.5], fov: 45 }}
        gl={{ alpha: true, antialias: true }}
        style={{ background: "transparent" }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.4} />
          <OrbCore color={color} glowColor={glowColor} size={size} audioLevelRef={audioLevelRef} />
          <OrbRings size={size} glowColor={glowColor} />
          <OrbParticles size={size} color={glowColor} />
          <EffectComposer multisampling={0}>
            <Bloom
              intensity={0.28}
              luminanceThreshold={0.35}
              luminanceSmoothing={0.25}
            />
          </EffectComposer>
          <OrbitControls
            enabled={interactive}
            enableZoom={false}
            enablePan={false}
            autoRotate
            autoRotateSpeed={0.18}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
