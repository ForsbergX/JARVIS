"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface RingProps {
  radius: number;
  color: string;
  tilt: [number, number, number];
  speed: number;
  opacity: number;
}

function Ring({ radius, color, tilt, speed, opacity }: RingProps) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.z += delta * speed;
  });

  return (
    <mesh ref={ref} rotation={tilt}>
      <torusGeometry args={[radius, 0.006 * radius, 8, 128]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} />
    </mesh>
  );
}

interface OrbRingsProps {
  size: number;
  glowColor: string;
}

export function OrbRings({ size, glowColor }: OrbRingsProps) {
  return (
    <group>
      <Ring
        radius={size * 1.6}
        color={glowColor}
        tilt={[Math.PI / 2.3, 0, 0]}
        speed={0.12}
        opacity={0.35}
      />
      <Ring
        radius={size * 1.85}
        color={glowColor}
        tilt={[Math.PI / 1.7, Math.PI / 5, 0]}
        speed={-0.08}
        opacity={0.2}
      />
      <Ring
        radius={size * 2.1}
        color={glowColor}
        tilt={[Math.PI / 3, -Math.PI / 6, 0]}
        speed={0.05}
        opacity={0.12}
      />
    </group>
  );
}
