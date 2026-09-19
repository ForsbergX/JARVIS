"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import "./BrainMaterial";
import type { BrainMaterialImpl } from "./BrainMaterial";
import { BrainCore } from "./BrainCore";
import { NeuralFilaments } from "./NeuralFilaments";
import { NeuralParticles } from "./NeuralParticles";
import { EnergyConnections } from "./EnergyConnections";
import { OrbHalo } from "@/components/orb/OrbHalo";
import { useEiraStore, type EiraState } from "@/store/useEiraStore";

interface EiraBrainProps {
  size?: number;
  audioLevelRef?: React.RefObject<number>;
}

const PRIMARY_COLOR = "#ff163d";
const SECONDARY_COLOR = "#f4f4f6";
const ERROR_COLOR = "#ff163d";

interface StateTarget {
  pulse: number;
  distortion: number;
  energy: number;
  thinking: number;
  speaking: number;
}

const STATE_TARGETS: Record<EiraState, StateTarget> = {
  idle: { pulse: 0, distortion: 0, energy: 0, thinking: 0, speaking: 0 },
  listening: { pulse: 0.15, distortion: 0.06, energy: 0.2, thinking: 0, speaking: 0 },
  thinking: { pulse: 0.1, distortion: 0.16, energy: 0.3, thinking: 1, speaking: 0 },
  speaking: { pulse: 0.15, distortion: 0.08, energy: 0.2, thinking: 0, speaking: 1 },
  executing: { pulse: 0.3, distortion: 0.18, energy: 0.35, thinking: 0.3, speaking: 0 },
  success: { pulse: 0.35, distortion: 0.05, energy: 0.4, thinking: 0, speaking: 0 },
  error: { pulse: 0.3, distortion: 0.32, energy: 0.4, thinking: 0, speaking: 0 },
};

export function EiraBrain({ size = 1.6, audioLevelRef }: EiraBrainProps) {
  const materialRef = useRef<BrainMaterialImpl>(null);
  const cageRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const secondaryColorTarget = useRef(new THREE.Color(SECONDARY_COLOR));

  useFrame((state, delta) => {
    const eiraState = useEiraStore.getState().state;
    const activePanel = useEiraStore.getState().activePanel;
    const target = STATE_TARGETS[eiraState];
    const level = audioLevelRef?.current ?? 0;
    const lerpSpeed = 1 - Math.pow(0.001, delta);

    if (materialRef.current) {
      const m = materialRef.current;
      m.uTime += delta;
      m.uPulse = THREE.MathUtils.lerp(m.uPulse, target.pulse, lerpSpeed);
      m.uDistortion = THREE.MathUtils.lerp(m.uDistortion, target.distortion, lerpSpeed);
      m.uEnergyIntensity = THREE.MathUtils.lerp(m.uEnergyIntensity, target.energy, lerpSpeed);
      m.uThinkingIntensity = THREE.MathUtils.lerp(m.uThinkingIntensity, target.thinking, lerpSpeed);
      m.uSpeakingIntensity = THREE.MathUtils.lerp(m.uSpeakingIntensity, target.speaking, lerpSpeed);
      m.uAudioLevel = THREE.MathUtils.lerp(m.uAudioLevel, level, 0.3);
      m.uScanProgress += delta * 0.05;

      secondaryColorTarget.current.set(eiraState === "error" ? ERROR_COLOR : SECONDARY_COLOR);
      m.uSecondaryColor.lerp(secondaryColorTarget.current, lerpSpeed);
    }

    if (cageRef.current) {
      const spin = 1 + level * 2 + target.thinking * 1.5;
      cageRef.current.rotation.y += delta * 0.06 * spin;
      cageRef.current.rotation.x += delta * 0.02 * spin;
    }

    if (groupRef.current) {
      // Nudge aside (never hidden) when a panel takes the foreground.
      const targetX = activePanel ? -size * 0.55 : 0;
      groupRef.current.position.x = THREE.MathUtils.lerp(
        groupRef.current.position.x,
        targetX,
        1 - Math.pow(0.0005, delta)
      );
    }
  });

  return (
    <group ref={groupRef}>
      <OrbHalo color={PRIMARY_COLOR} size={size} audioLevelRef={audioLevelRef} />

      <mesh>
        <icosahedronGeometry args={[size, 48]} />
        <brainMaterial
          ref={materialRef}
          uPrimaryColor={new THREE.Color(PRIMARY_COLOR)}
          uSecondaryColor={new THREE.Color(SECONDARY_COLOR)}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      <BrainCore color={SECONDARY_COLOR} size={size} audioLevelRef={audioLevelRef} />

      <mesh ref={cageRef} scale={1.1}>
        <icosahedronGeometry args={[size, 1]} />
        <meshBasicMaterial
          color={PRIMARY_COLOR}
          wireframe
          transparent
          opacity={0.1}
          depthWrite={false}
        />
      </mesh>

      <NeuralFilaments size={size} color={SECONDARY_COLOR} audioLevelRef={audioLevelRef} />
      <NeuralParticles size={size} color="#ff536e" audioLevelRef={audioLevelRef} />
      <EnergyConnections size={size} color="#d6d6dc" />

      <pointLight color={PRIMARY_COLOR} intensity={2.2} distance={size * 7} decay={2} />
    </group>
  );
}
