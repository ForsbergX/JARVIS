export const energyLineFragmentShader = /* glsl */ `
uniform vec3 uColor;
uniform float uTime;
uniform float uSpeed;
uniform float uIntensity;
varying float vProgress;

void main() {
  float band = fract(vProgress * 3.0 - uTime * uSpeed);
  float glow = smoothstep(0.18, 0.0, band) + smoothstep(0.82, 1.0, band);
  float alpha = clamp(0.12 + glow * uIntensity, 0.0, 1.0);
  gl_FragColor = vec4(uColor, alpha);
}
`;
