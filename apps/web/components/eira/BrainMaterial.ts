import * as THREE from "three";
import { shaderMaterial } from "@react-three/drei";
import { extend, type ThreeElement } from "@react-three/fiber";
import { brainVertexShader } from "./shaders/brainVertex";
import { brainFragmentShader } from "./shaders/brainFragment";
import { energyLineVertexShader } from "./shaders/energyLineVertex";
import { energyLineFragmentShader } from "./shaders/energyLineFragment";

export const BrainMaterial = shaderMaterial(
  {
    uTime: 0,
    uPrimaryColor: new THREE.Color("#8b5cf6"),
    uSecondaryColor: new THREE.Color("#f5f3ff"),
    uDisplacement: 0.16,
    uSpeed: 0.22,
    uOpacity: 0.94,
    uFresnelPower: 2.1,
    uPulse: 0,
    uDistortion: 0,
    uEnergyIntensity: 0,
    uAudioLevel: 0,
    uThinkingIntensity: 0,
    uSpeakingIntensity: 0,
    uScanProgress: 0,
  },
  brainVertexShader,
  brainFragmentShader
);

export const EnergyLineMaterial = shaderMaterial(
  {
    uColor: new THREE.Color("#c084fc"),
    uTime: 0,
    uSpeed: 0.6,
    uIntensity: 1,
  },
  energyLineVertexShader,
  energyLineFragmentShader
);

BrainMaterial.key = THREE.MathUtils.generateUUID();
EnergyLineMaterial.key = THREE.MathUtils.generateUUID();

extend({ BrainMaterial, EnergyLineMaterial });

type LiveBrainUniforms = {
  uPulse: number;
  uDistortion: number;
  uEnergyIntensity: number;
  uAudioLevel: number;
  uThinkingIntensity: number;
  uSpeakingIntensity: number;
  uScanProgress: number;
};

export type BrainMaterialImpl = InstanceType<typeof BrainMaterial> &
  LiveBrainUniforms & {
    uTime: number;
    uPrimaryColor: THREE.Color;
    uSecondaryColor: THREE.Color;
    uDisplacement: number;
    uSpeed: number;
    uOpacity: number;
    uFresnelPower: number;
  };

export type EnergyLineMaterialImpl = InstanceType<typeof EnergyLineMaterial> & {
  uColor: THREE.Color;
  uTime: number;
  uSpeed: number;
  uIntensity: number;
};

declare module "@react-three/fiber" {
  interface ThreeElements {
    brainMaterial: ThreeElement<typeof BrainMaterial>;
    energyLineMaterial: ThreeElement<typeof EnergyLineMaterial>;
  }
}
