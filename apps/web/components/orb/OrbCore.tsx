"use client";

import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import "./OrbMaterial";
import type { OrbMaterialImpl } from "./OrbMaterial";

interface OrbCoreProps {
  color: string;
  glowColor: string;
  size: number;
  /** 0–1 live voice amplitude; when provided, pulses the existing look instead of changing it. */
  audioLevelRef?: React.RefObject<number>;
}

export function OrbCore({ color, glowColor, size, audioLevelRef }: OrbCoreProps) {
  const materialRef = useRef<OrbMaterialImpl>(null);
  const cageRef = useRef<THREE.Mesh>(null);
  const baseDisplacement = useRef(0);
  const baseSpeed = useRef(0);

  useEffect(() => {
    if (materialRef.current) {
      baseDisplacement.current = materialRef.current.uDisplacement;
      baseSpeed.current = materialRef.current.uSpeed;
    }
  }, []);

  useFrame((state, delta) => {
    const level = audioLevelRef?.current ?? 0;

    if (materialRef.current) {
      materialRef.current.uTime += delta;
      materialRef.current.uDisplacement = baseDisplacement.current + level * 0.45;
      materialRef.current.uSpeed = baseSpeed.current + level * 0.9;
    }
    if (cageRef.current) {
      const spin = 1 + level * 3;
      cageRef.current.rotation.y += delta * 0.08 * spin;
      cageRef.current.rotation.x += delta * 0.03 * spin;
    }
  });

  return (
    <group>
      <mesh>
        <icosahedronGeometry args={[size, 64]} />
        <orbMaterial
          ref={materialRef}
          uColor={new THREE.Color(color)}
          uGlowColor={new THREE.Color(glowColor)}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh ref={cageRef} scale={1.12}>
        <icosahedronGeometry args={[size, 1]} />
        <meshBasicMaterial
          color={glowColor}
          wireframe
          transparent
          opacity={0.12}
          depthWrite={false}
        />
      </mesh>

      <pointLight color={glowColor} intensity={2.5} distance={size * 6} decay={2} />
    </group>
  );
}
