"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface OrbParticlesProps {
  count?: number;
  size: number;
  color: string;
}

export function OrbParticles({ count = 220, size, color }: OrbParticlesProps) {
  const pointsRef = useRef<THREE.Points>(null);

  const { positions, radii, speeds, offsets } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const radii = new Float32Array(count);
    const speeds = new Float32Array(count);
    const offsets = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const radius = size * (1.4 + Math.random() * 1.4);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      radii[i] = radius;
      speeds[i] = 0.05 + Math.random() * 0.15;
      offsets[i] = Math.random() * Math.PI * 2;
    }

    return { positions, radii, speeds, offsets };
  }, [count, size]);

  useFrame((state) => {
    if (!pointsRef.current) return;
    const t = state.clock.elapsedTime;
    const posAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;

    for (let i = 0; i < count; i++) {
      const angle = t * speeds[i] + offsets[i];
      const radius = radii[i];
      const baseX = posAttr.getX(i);
      const baseZ = posAttr.getZ(i);
      const dist = Math.sqrt(baseX * baseX + baseZ * baseZ) || radius;

      posAttr.setX(i, Math.cos(angle) * dist);
      posAttr.setZ(i, Math.sin(angle) * dist);
    }
    posAttr.needsUpdate = true;
    pointsRef.current.rotation.y = t * 0.02;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color={color}
        size={size * 0.03}
        transparent
        opacity={0.85}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
