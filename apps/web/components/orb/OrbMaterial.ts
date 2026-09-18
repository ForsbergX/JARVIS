import * as THREE from "three";
import { shaderMaterial } from "@react-three/drei";
import { extend, type ThreeElement } from "@react-three/fiber";
import { orbFragmentShader, orbVertexShader } from "./shaders";

export const OrbMaterial = shaderMaterial(
  {
    uTime: 0,
    uColor: new THREE.Color("#5b21b6"),
    uGlowColor: new THREE.Color("#c4b5fd"),
    uDisplacement: 0.18,
    uSpeed: 0.25,
    uOpacity: 0.92,
    uFresnelPower: 2.2,
  },
  orbVertexShader,
  orbFragmentShader
);

OrbMaterial.key = THREE.MathUtils.generateUUID();

extend({ OrbMaterial });

export type OrbMaterialImpl = InstanceType<typeof OrbMaterial> & {
  uTime: number;
  uColor: THREE.Color;
  uGlowColor: THREE.Color;
  uDisplacement: number;
  uSpeed: number;
  uOpacity: number;
  uFresnelPower: number;
};

declare module "@react-three/fiber" {
  interface ThreeElements {
    orbMaterial: ThreeElement<typeof OrbMaterial>;
  }
}
