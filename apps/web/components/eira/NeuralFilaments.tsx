"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import "./BrainMaterial";
import type { EnergyLineMaterialImpl } from "./BrainMaterial";

interface NeuralFilamentsProps {
  size: number;
  color: string;
  count?: number;
  audioLevelRef?: React.RefObject<number>;
}

/** A procedural network of glowing lines across the brain's surface, each
 * carrying a traveling pulse — stands in for a real neural pathway mesh. */
export function NeuralFilaments({ size, color, count = 22, audioLevelRef }: NeuralFilamentsProps) {
  const materialRef = useRef<EnergyLineMaterialImpl>(null);

  const geometry = useMemo(() => {
    const positions: number[] = [];
    const progress: number[] = [];
    const radius = size * 1.02;

    function randomPointOnSphere(): THREE.Vector3 {
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      return new THREE.Vector3(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi)
      );
    }

    for (let i = 0; i < count; i++) {
      const start = randomPointOnSphere();
      const end = randomPointOnSphere();
      const mid = start.clone().add(end).multiplyScalar(0.5).normalize().multiplyScalar(radius * 1.15);

      const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
      const points = curve.getPoints(14);
      // LineSegments draws disjoint pairs, so each consecutive point pair
      // becomes its own segment — this keeps the 22 filaments from
      // connecting into one another while staying a single draw call.
      for (let i = 0; i < points.length - 1; i++) {
        const a = points[i];
        const b = points[i + 1];
        positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
        progress.push(i / (points.length - 1), (i + 1) / (points.length - 1));
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute("aProgress", new THREE.Float32BufferAttribute(progress, 1));
    return geo;
  }, [size, count]);

  useFrame((state, delta) => {
    if (!materialRef.current) return;
    const level = audioLevelRef?.current ?? 0;
    materialRef.current.uTime += delta;
    materialRef.current.uIntensity = 0.6 + level * 1.4;
  });

  return (
    <lineSegments geometry={geometry}>
      <energyLineMaterial
        ref={materialRef}
        uColor={new THREE.Color(color)}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </lineSegments>
  );
}
