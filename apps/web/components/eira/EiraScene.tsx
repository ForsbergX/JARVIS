"use client";

import { Suspense, useEffect, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, Bloom, DepthOfField, Noise, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import { EiraBrain } from "./EiraBrain";
import { DataChamber } from "./DataChamber";
import { useEiraStore } from "@/store/useEiraStore";

interface EiraSceneProps {
  audioLevelRef?: React.RefObject<number>;
}

function CameraRig() {
  const { camera } = useThree();
  const mouse = useRef({ x: 0, y: 0 });
  const reducedMotion = useRef(false);

  useEffect(() => {
    reducedMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    function onMove(event: MouseEvent) {
      mouse.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = (event.clientY / window.innerHeight) * 2 - 1;
    }
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  useFrame((state, delta) => {
    const activePanel = useEiraStore.getState().activePanel;
    const parallaxStrength = reducedMotion.current ? 0 : 0.35;
    const targetX = mouse.current.x * parallaxStrength + (activePanel ? -0.6 : 0);
    const targetY = -mouse.current.y * parallaxStrength * 0.5 + 0.1;

    const lerp = 1 - Math.pow(0.0008, delta);
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetX, lerp);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, lerp);
    camera.lookAt(0, 0, 0);
  });

  return null;
}

export function EiraScene({ audioLevelRef }: EiraSceneProps) {
  const quality = useEiraStore((s) => s.quality);
  const dpr: [number, number] = quality === "low" ? [1, 1] : [1, 1.5];

  return (
    <Canvas
      camera={{ position: [0, 0.1, 7], fov: 42 }}
      dpr={dpr}
      gl={{ alpha: true, antialias: true }}
      style={{ background: "transparent" }}
    >
      <Suspense fallback={null}>
        <ambientLight intensity={0.3} />
        <DataChamber />
        <EiraBrain size={1.6} audioLevelRef={audioLevelRef} />
        <CameraRig />

        <EffectComposer multisampling={0}>
          <Bloom intensity={0.3} luminanceThreshold={0.32} luminanceSmoothing={0.25} />
          {quality === "high" ? (
            <DepthOfField focusDistance={0.02} focalLength={0.05} bokehScale={2.2} />
          ) : (
            <></>
          )}
          <Noise opacity={0.025} />
          <Vignette eskil={false} offset={0.25} darkness={0.9} />
        </EffectComposer>
      </Suspense>
    </Canvas>
  );
}
