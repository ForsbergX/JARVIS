"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import "./OrbMaterial";
import type { OrbCoreGlowMaterialImpl } from "./OrbMaterial";

interface OrbGlowCoreProps {
  color: string;
  size: number;
  audioLevelRef?: React.RefObject<number>;
}

export function OrbGlowCore({ color, size, audioLevelRef }: OrbGlowCoreProps) {
  const materialRef = useRef<OrbCoreGlowMaterialImpl>(null);

  useFrame((state, delta) => {
    if (!materialRef.current) return;
    const level = audioLevelRef?.current ?? 0;
    materialRef.current.uTime += delta;
    materialRef.current.uPulse = level * 1.2;
    materialRef.current.uDistortion = level * 0.6;
    materialRef.current.uEnergyIntensity = level * 1.6;
  });

  return (
    <mesh scale={0.55}>
      <icosahedronGeometry args={[size, 32]} />
      <orbCoreGlowMaterial
        ref={materialRef}
        uColor={new THREE.Color(color)}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}
