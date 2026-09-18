"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import "./OrbMaterial";
import type { OrbMaterialImpl } from "./OrbMaterial";

interface OrbCoreProps {
  color: string;
  glowColor: string;
  size: number;
}

export function OrbCore({ color, glowColor, size }: OrbCoreProps) {
  const materialRef = useRef<OrbMaterialImpl>(null);
  const cageRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (materialRef.current) {
      materialRef.current.uTime += delta;
    }
    if (cageRef.current) {
      cageRef.current.rotation.y += delta * 0.08;
      cageRef.current.rotation.x += delta * 0.03;
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
