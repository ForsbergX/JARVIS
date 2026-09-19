"use client";

import { useEiraStore } from "@/store/useEiraStore";
import { openPanel, closePanel } from "@/lib/jarvisActions";
import { PANEL_LAYOUT } from "./panelLayout";
import { HologramPanel } from "./HologramPanel";
import { GoogleAdsPanel } from "./googleAds/GoogleAdsPanel";
import { FinancePanel } from "./finance/FinancePanel";
import { AlmanacPanel } from "./almanac/AlmanacPanel";

// Panels with their own dedicated, larger active-state component —
// HologramPanel still renders their dormant tray thumbnail as before.
const DEDICATED_PANEL_IDS = new Set(["ads", "finance", "almanac"]);

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
      {PANEL_LAYOUT.map((panel, index) => {
        if (DEDICATED_PANEL_IDS.has(panel.id) && activePanel === panel.id) return null;

        return (
          <div key={panel.id} style={{ pointerEvents: "auto" }}>
            <HologramPanel
              panel={panel}
              index={index}
              active={activePanel === panel.id}
              dimmed={activePanel !== null && activePanel !== panel.id}
              onSelect={() => (activePanel === panel.id ? closePanel() : openPanel(panel.id))}
            />
          </div>
        );
      })}

      <GoogleAdsPanel active={activePanel === "ads"} />
      <FinancePanel active={activePanel === "finance"} />
      <AlmanacPanel active={activePanel === "almanac"} />
    </div>
  );
}
