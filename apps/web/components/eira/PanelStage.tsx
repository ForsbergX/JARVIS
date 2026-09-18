"use client";

import { AnimatePresence } from "motion/react";
import { useEiraStore } from "@/store/useEiraStore";
import { openPanel, closePanel } from "@/lib/jarvisActions";
import { PANEL_LAYOUT } from "./panelLayout";
import { HologramPanel } from "./HologramPanel";
import { GoogleAdsPanel } from "./googleAds/GoogleAdsPanel";

export function PanelStage() {
  const activePanel = useEiraStore((s) => s.activePanel);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        perspective: "1600px",
        pointerEvents: "none",
      }}
    >
      {PANEL_LAYOUT.map((panel) => {
        // Google Ads gets its own dedicated, larger component once active;
        // HologramPanel still renders its dormant tray thumbnail as before.
        if (panel.id === "ads" && activePanel === "ads") return null;

        return (
          <div key={panel.id} style={{ pointerEvents: "auto" }}>
            <HologramPanel
              panel={panel}
              active={activePanel === panel.id}
              dimmed={activePanel !== null && activePanel !== panel.id}
              onSelect={() => (activePanel === panel.id ? closePanel() : openPanel(panel.id))}
            />
          </div>
        );
      })}

      <AnimatePresence>
        {activePanel === "ads" && <GoogleAdsPanel key="google-ads-panel" />}
      </AnimatePresence>
    </div>
  );
}
