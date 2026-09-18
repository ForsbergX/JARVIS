export const brainFragmentShader = /* glsl */ `
uniform vec3 uPrimaryColor;
uniform vec3 uSecondaryColor;
uniform float uTime;
uniform float uOpacity;
uniform float uFresnelPower;
uniform float uPulse;
uniform float uEnergyIntensity;
uniform float uAudioLevel;
uniform float uThinkingIntensity;
uniform float uSpeakingIntensity;
uniform float uScanProgress;

varying vec3 vNormal;
varying vec3 vViewPosition;
varying float vNoise;
varying vec3 vLocalPos;

void main() {
  vec3 viewDir = normalize(vViewPosition);
  float fresnel = pow(clamp(1.0 - clamp(dot(viewDir, vNormal), 0.0, 1.0), 0.0, 1.0), uFresnelPower);

  float pulse = 0.6 + 0.4 * sin(uTime * 1.4) + uPulse;
  float veins = smoothstep(0.3, 0.9, vNoise * 0.5 + 0.5);

  // A soft scanline band drifting up through the brain; speeds up while thinking.
  float scanSpeed = 0.06 + uThinkingIntensity * 0.22;
  float scanY = fract(uTime * scanSpeed + uScanProgress);
  float bandDist = abs(fract(vLocalPos.y * 0.5 + 0.5) - scanY);
  float scan = smoothstep(0.04, 0.0, min(bandDist, 1.0 - bandDist)) * 0.5;

  vec3 nerveColor = mix(uSecondaryColor, uPrimaryColor, 0.15);
  vec3 core = mix(uPrimaryColor, nerveColor, veins);
  float energy = 1.0 + uEnergyIntensity * 0.4 + uAudioLevel * 0.22;
  // Capped below 1.0 so the rim never fully bleaches to white — the violet
  // structure stays readable even at full speaking intensity + loud audio.
  float whiteMix = clamp(uSpeakingIntensity * 0.32 + uAudioLevel * 0.22, 0.0, 0.55);
  vec3 rim = mix(uPrimaryColor, uSecondaryColor, whiteMix) * fresnel * (0.65 + pulse * 0.25) * energy;

  vec3 color = core * (0.26 + veins * 0.26) * (1.0 + uEnergyIntensity * 0.18) + rim + uSecondaryColor * scan * 0.45;

  float alpha = clamp(fresnel * 0.85 + veins * 0.2 + 0.1 + scan * 0.25, 0.0, 1.0) * uOpacity;

  gl_FragColor = vec4(color, alpha);
}
`;
