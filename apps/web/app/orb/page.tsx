"use client";

import dynamic from "next/dynamic";

const AlienOrb = dynamic(
  () => import("@/components/orb/AlienOrb").then((m) => m.AlienOrb),
  { ssr: false }
);

export default function OrbPage() {
  return (
    <main
      style={{
        width: "100vw",
        height: "100vh",
        background: "radial-gradient(circle at center, #0a0612 0%, #000000 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ width: "min(80vw, 720px)", height: "min(80vw, 720px)" }}>
        <AlienOrb color="#5b21b6" glowColor="#c4b5fd" size={1.4} />
      </div>
    </main>
  );
}
