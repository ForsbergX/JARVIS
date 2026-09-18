"use client";

import dynamic from "next/dynamic";

const EiraExperience = dynamic(
  () => import("@/components/eira/EiraExperience").then((m) => m.EiraExperience),
  { ssr: false }
);

export default function EiraPage() {
  return <EiraExperience />;
}
