import { simplexNoise3D } from "./noise";

export const brainVertexShader = /* glsl */ `
uniform float uTime;
uniform float uDisplacement;
uniform float uSpeed;
uniform float uDistortion;
uniform float uThinkingIntensity;

varying vec3 vNormal;
varying vec3 vViewPosition;
varying float vNoise;
varying vec3 vLocalPos;

${simplexNoise3D}

void main() {
  vec3 pos = position;
  float speed = uSpeed * (1.0 + uThinkingIntensity * 1.5);

  float slow = snoise(pos * 1.3 + uTime * speed);
  float fine = snoise(pos * 3.5 - uTime * speed * 1.6) * 0.3;
  float noise = slow + fine;

  // Central sulcus: a soft groove along the mid-sagittal plane separating
  // the two hemispheres, driven purely by position — no extra attributes.
  float sulcus = smoothstep(0.22, 0.0, abs(pos.x)) * 0.14;

  pos += normal * (noise * (uDisplacement + uDistortion) - sulcus);
  vNoise = noise;
  vLocalPos = position;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  vViewPosition = -mvPosition.xyz;
  vNormal = normalize(normalMatrix * normal);

  gl_Position = projectionMatrix * mvPosition;
}
`;
