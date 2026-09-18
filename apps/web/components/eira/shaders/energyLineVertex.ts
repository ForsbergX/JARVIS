export const energyLineVertexShader = /* glsl */ `
attribute float aProgress;
varying float vProgress;

void main() {
  vProgress = aProgress;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;
