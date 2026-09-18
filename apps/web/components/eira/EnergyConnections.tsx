"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { EnergyLineMaterial, type EnergyLineMaterialImpl } from "./BrainMaterial";
import { useEiraStore } from "@/store/useEiraStore";
import { getPanelLayout } from "./panelLayout";

interface EnergyConnectionsProps {
  size: number;
  color: string;
}

/** A concentrated energy pulse traveling from the brain toward whichever
 * panel is being activated — visible only while a panel is opening.
 * Built imperatively (not the `<line>` JSX intrinsic, which collides with
 * the DOM's SVG `<line>` element in this TS setup). */
export function EnergyConnections({ size, color }: EnergyConnectionsProps) {
  const activePanel = useEiraStore((s) => s.activePanel);
  const eiraState = useEiraStore((s) => s.state);
  const visibleUntil = useRef(0);

  const { line, geometry, material } = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(new Float32Array(2 * 3), 3)
    );
    geometry.setAttribute("aProgress", new THREE.Float32BufferAttribute([0, 1], 1));

    const material = new EnergyLineMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }) as EnergyLineMaterialImpl;
    material.uColor = new THREE.Color(color);
    material.uSpeed = 1.8;
    material.uIntensity = 0;

    const line = new THREE.Line(geometry, material);
    return { line, geometry, material };
  }, [color]);

  useFrame((state, delta) => {
    if (activePanel && eiraState === "executing") {
      visibleUntil.current = state.clock.elapsedTime + 1.4;
      const dir = getPanelLayout(activePanel).beamDirection;
      const end = new THREE.Vector3(...dir).normalize().multiplyScalar(size * 3.2);
      const posAttr = geometry.attributes.position as THREE.BufferAttribute;
      posAttr.setXYZ(0, 0, 0, 0);
      posAttr.setXYZ(1, end.x, end.y, end.z);
      posAttr.needsUpdate = true;
    }

    const visible = state.clock.elapsedTime < visibleUntil.current;
    material.uTime += delta;
    material.uIntensity = visible ? 2.2 : 0;
  });

  return <primitive object={line} />;
}
