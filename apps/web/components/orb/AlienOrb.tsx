"use client";

import { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { EffectComposer, Bloom, ChromaticAberration } from "@react-three/postprocessing";
import { Vector2 } from "three";
import { OrbCore } from "./OrbCore";
import { OrbRings } from "./OrbRings";
import { OrbParticles } from "./OrbParticles";

export interface AlienOrbProps {
  color?: string;
  glowColor?: string;
  size?: number;
  interactive?: boolean;
  className?: string;
}

export function AlienOrb({
  color = "#5b21b6",
  glowColor = "#c4b5fd",
  size = 1.4,
  interactive = true,
  className,
}: AlienOrbProps) {
  const chromaticOffset = useMemo(() => new Vector2(0.0006, 0.0012), []);

  return (
    <div className={className} style={{ width: "100%", height: "100%" }}>
      <Canvas
        camera={{ position: [0, 0, 5.5], fov: 45 }}
        gl={{ alpha: true, antialias: true }}
        style={{ background: "transparent" }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.4} />
          <OrbCore color={color} glowColor={glowColor} size={size} />
          <OrbRings size={size} glowColor={glowColor} />
          <OrbParticles size={size} color={glowColor} />
          <EffectComposer multisampling={0}>
            <Bloom
              intensity={1.4}
              luminanceThreshold={0.15}
              luminanceSmoothing={0.4}
              mipmapBlur
            />
            <ChromaticAberration
              offset={chromaticOffset}
              radialModulation={false}
              modulationOffset={0}
            />
          </EffectComposer>
          <OrbitControls
            enabled={interactive}
            enableZoom={false}
            enablePan={false}
            autoRotate
            autoRotateSpeed={0.6}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
