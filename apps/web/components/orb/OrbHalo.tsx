"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import "./OrbMaterial";
import type { OrbHaloMaterialImpl } from "./OrbMaterial";

interface OrbHaloProps {
  color: string;
  size: number;
  audioLevelRef?: React.RefObject<number>;
}

export function OrbHalo({ color, size, audioLevelRef }: OrbHaloProps) {
  const materialRef = useRef<OrbHaloMaterialImpl>(null);

  useFrame(() => {
    if (materialRef.current) {
      const level = audioLevelRef?.current ?? 0;
      materialRef.current.uEnergyIntensity = level * 1.6;
    }
  });

  return (
    <mesh scale={1.35}>
      <icosahedronGeometry args={[size, 16]} />
      <orbHaloMaterial
        ref={materialRef}
        uColor={new THREE.Color(color)}
        transparent
        depthWrite={false}
        side={THREE.BackSide}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}
