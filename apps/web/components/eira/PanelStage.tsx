"use client";

import { useEiraStore } from "@/store/useEiraStore";
import { PANEL_LAYOUT } from "./panelLayout";
import { HologramPanel } from "./HologramPanel";

export function PanelStage() {
  const activePanel = useEiraStore((s) => s.activePanel);
  const openPanel = useEiraStore((s) => s.openPanel);
  const closePanel = useEiraStore((s) => s.closePanel);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        perspective: "1600px",
        pointerEvents: "none",
      }}
    >
      {PANEL_LAYOUT.map((panel) => (
        <div key={panel.id} style={{ pointerEvents: "auto" }}>
          <HologramPanel
            panel={panel}
            active={activePanel === panel.id}
            dimmed={activePanel !== null && activePanel !== panel.id}
            onSelect={() => (activePanel === panel.id ? closePanel() : openPanel(panel.id))}
          />
        </div>
      ))}
    </div>
  );
}
