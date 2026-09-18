"use client";

import { OrbGlowCore } from "@/components/orb/OrbGlowCore";

interface BrainCoreProps {
  color: string;
  size: number;
  audioLevelRef?: React.RefObject<number>;
}

/** The brain's inner plasma light — reuses the orb's proven volumetric-glow
 * core rather than re-deriving the same effect under a new name. */
export function BrainCore({ color, size, audioLevelRef }: BrainCoreProps) {
  return <OrbGlowCore color={color} size={size} audioLevelRef={audioLevelRef} />;
}
