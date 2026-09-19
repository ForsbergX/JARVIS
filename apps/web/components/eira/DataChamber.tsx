"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/** The room around Eira: a faint grid horizon and drifting dust motes,
 * giving the brain somewhere to float rather than empty black space. */
export function DataChamber() {
  const gridRef = useRef<THREE.LineSegments>(null);
  const dustRef = useRef<THREE.Points>(null);

  const gridGeometry = useMemo(() => new THREE.PolarGridHelper(14, 24, 8, 64).geometry, []);

  const dust = useMemo(() => {
    const count = 400;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const radius = 6 + Math.random() * 10;
      const theta = Math.random() * Math.PI * 2;
      const y = (Math.random() - 0.5) * 10;
      positions[i * 3] = Math.cos(theta) * radius;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = Math.sin(theta) * radius;
    }
    return positions;
  }, []);

  useFrame((state, delta) => {
    if (gridRef.current) gridRef.current.rotation.y += delta * 0.01;
    if (dustRef.current) dustRef.current.rotation.y -= delta * 0.006;
  });

  return (
    <group>
      <lineSegments ref={gridRef} geometry={gridGeometry} position={[0, -4.5, 0]}>
        <lineBasicMaterial color="#7a0018" transparent opacity={0.25} />
      </lineSegments>

      <points ref={dustRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[dust, 3]} />
        </bufferGeometry>
        <pointsMaterial
          color="#ff536e"
          size={0.02}
          transparent
          opacity={0.35}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      <fog attach="fog" args={["#020203", 8, 26]} />
    </group>
  );
}
