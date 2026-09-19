import * as THREE from "three";
import { shaderMaterial } from "@react-three/drei";
import { extend, type ThreeElement } from "@react-three/fiber";
import {
  orbFragmentShader,
  orbVertexShader,
  orbCoreGlowFragmentShader,
  orbCoreGlowVertexShader,
  orbHaloFragmentShader,
  orbHaloVertexShader,
} from "./shaders";

export const OrbMaterial = shaderMaterial(
  {
    uTime: 0,
    uColor: new THREE.Color("#7a0018"),
    uGlowColor: new THREE.Color("#ff163d"),
    uDisplacement: 0.18,
    uSpeed: 0.25,
    uOpacity: 0.92,
    uFresnelPower: 2.2,
    // Live-controllable knobs — 0 at rest, driven externally (e.g. by voice
    // amplitude) to make the orb pulse, distort and brighten while "speaking".
    uPulse: 0,
    uDistortion: 0,
    uEnergyIntensity: 0,
  },
  orbVertexShader,
  orbFragmentShader
);

export const OrbCoreGlowMaterial = shaderMaterial(
  {
    uTime: 0,
    uColor: new THREE.Color("#ff536e"),
    uPulse: 0,
    uDistortion: 0,
    uEnergyIntensity: 0,
  },
  orbCoreGlowVertexShader,
  orbCoreGlowFragmentShader
);

export const OrbHaloMaterial = shaderMaterial(
  {
    uColor: new THREE.Color("#ff163d"),
    uEnergyIntensity: 0,
  },
  orbHaloVertexShader,
  orbHaloFragmentShader
);

OrbMaterial.key = THREE.MathUtils.generateUUID();
OrbCoreGlowMaterial.key = THREE.MathUtils.generateUUID();
OrbHaloMaterial.key = THREE.MathUtils.generateUUID();

extend({ OrbMaterial, OrbCoreGlowMaterial, OrbHaloMaterial });

type LiveUniforms = {
  uPulse: number;
  uDistortion: number;
  uEnergyIntensity: number;
};

export type OrbMaterialImpl = InstanceType<typeof OrbMaterial> &
  LiveUniforms & {
    uTime: number;
    uColor: THREE.Color;
    uGlowColor: THREE.Color;
    uDisplacement: number;
    uSpeed: number;
    uOpacity: number;
    uFresnelPower: number;
  };

export type OrbCoreGlowMaterialImpl = InstanceType<typeof OrbCoreGlowMaterial> &
  LiveUniforms & {
    uTime: number;
    uColor: THREE.Color;
  };

export type OrbHaloMaterialImpl = InstanceType<typeof OrbHaloMaterial> & {
  uColor: THREE.Color;
  uEnergyIntensity: number;
};

declare module "@react-three/fiber" {
  interface ThreeElements {
    orbMaterial: ThreeElement<typeof OrbMaterial>;
    orbCoreGlowMaterial: ThreeElement<typeof OrbCoreGlowMaterial>;
    orbHaloMaterial: ThreeElement<typeof OrbHaloMaterial>;
  }
}
