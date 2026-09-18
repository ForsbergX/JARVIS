// Ashima simplex noise (3D), public domain / MIT-style license, widely used in shader work.
const simplexNoise3D = /* glsl */ `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  i = mod289(i);
  vec4 p = permute(permute(permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
          + i.y + vec4(0.0, i1.y, i2.y, 1.0))
          + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}
`;

// Outer shell: the displaced, veined "skin" of the orb.
export const orbVertexShader = /* glsl */ `
uniform float uTime;
uniform float uDisplacement;
uniform float uSpeed;
uniform float uDistortion;

varying vec3 vNormal;
varying vec3 vViewPosition;
varying float vNoise;

${simplexNoise3D}

void main() {
  vec3 pos = position;

  float slow = snoise(pos * 1.4 + uTime * uSpeed);
  float fine = snoise(pos * 4.0 - uTime * uSpeed * 1.7) * 0.3;
  float noise = slow + fine;

  pos += normal * noise * (uDisplacement + uDistortion);
  vNoise = noise;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  vViewPosition = -mvPosition.xyz;
  vNormal = normalize(normalMatrix * normal);

  gl_Position = projectionMatrix * mvPosition;
}
`;

export const orbFragmentShader = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uGlowColor;
uniform float uTime;
uniform float uOpacity;
uniform float uFresnelPower;
uniform float uPulse;
uniform float uEnergyIntensity;

varying vec3 vNormal;
varying vec3 vViewPosition;
varying float vNoise;

void main() {
  vec3 viewDir = normalize(vViewPosition);
  float fresnel = pow(1.0 - clamp(dot(viewDir, vNormal), 0.0, 1.0), uFresnelPower);

  float pulse = 0.6 + 0.4 * sin(uTime * 1.6) + uPulse;
  float veins = smoothstep(0.35, 0.95, vNoise * 0.5 + 0.5);
  float energy = 1.0 + uEnergyIntensity;

  vec3 core = mix(uColor, uGlowColor, veins);
  vec3 rim = uGlowColor * fresnel * (0.9 + pulse * 0.5) * energy;
  vec3 color = core * (0.32 + veins * 0.32) * (1.0 + uEnergyIntensity * 0.4) + rim;

  float alpha = clamp(fresnel * 0.85 + veins * 0.22 + 0.08, 0.0, 1.0) * uOpacity;

  gl_FragColor = vec4(color, alpha);
}
`;

// Inner core: a soft, camera-facing plasma glow to fake volumetric depth
// without real raymarching — bright at the center, fading toward the rim.
export const orbCoreGlowVertexShader = /* glsl */ `
uniform float uTime;
uniform float uDistortion;

varying vec3 vNormal;
varying vec3 vViewPosition;

${simplexNoise3D}

void main() {
  vec3 pos = position;
  float wobble = snoise(pos * 2.2 + uTime * 0.6) * (0.05 + uDistortion * 0.15);
  pos += normal * wobble;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  vViewPosition = -mvPosition.xyz;
  vNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * mvPosition;
}
`;

export const orbCoreGlowFragmentShader = /* glsl */ `
uniform vec3 uColor;
uniform float uTime;
uniform float uPulse;
uniform float uEnergyIntensity;

varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
  vec3 viewDir = normalize(vViewPosition);
  float facing = clamp(dot(viewDir, vNormal), 0.0, 1.0);
  float glow = pow(facing, 1.6);

  float pulse = 0.7 + 0.3 * sin(uTime * 2.1) + uPulse * 0.8;
  vec3 color = uColor * glow * pulse * (1.0 + uEnergyIntensity);

  gl_FragColor = vec4(color, glow * 0.85);
}
`;

// Halo: rendered on the back faces of an oversized sphere so only the
// silhouette rim shows — a cheap "atmosphere" glow around the orb.
export const orbHaloVertexShader = /* glsl */ `
varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = -mvPosition.xyz;
  vNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * mvPosition;
}
`;

export const orbHaloFragmentShader = /* glsl */ `
uniform vec3 uColor;
uniform float uEnergyIntensity;

varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
  vec3 viewDir = normalize(vViewPosition);
  // Rendered with BackSide: bright at grazing angles (the silhouette),
  // faint where the far shell faces the camera head-on — a cheap atmosphere rim.
  float facing = dot(viewDir, vNormal);
  float rim = pow(clamp(1.0 - abs(facing), 0.0, 1.0), 3.0);
  vec3 color = uColor * rim * (1.0 + uEnergyIntensity);
  gl_FragColor = vec4(color, rim * 0.5);
}
`;
