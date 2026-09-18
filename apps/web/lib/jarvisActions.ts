import { useEiraStore, PANEL_IDS, type PanelId } from "@/store/useEiraStore";

export { PANEL_IDS };
export type { PanelId };

// Time the closing panel spends fully hidden before the new one animates in,
// and how long the "success" flash holds after a panel opens.
const PANEL_SWITCH_DELAY_MS = 500;
const SUCCESS_DELAY_MS = 650;

function isPanelId(value: string): value is PanelId {
  return (PANEL_IDS as readonly string[]).includes(value);
}

/**
 * Jarvis's central action system.
 *
 * These are the only two dashboard actions Jarvis can take right now:
 * open one of the five panels, or close whichever one is open. They are
 * plain functions with no dependency on React, voice recognition, or any
 * particular caller — the local voice-command matcher calls them today,
 * and the same two functions are what a future AI model would invoke via
 * tool/function calling, unchanged. All panel-open/close orchestration
 * (closing what's open first, updating dashboard state, animating the new
 * panel forward) lives here and only here, so every caller gets identical
 * behavior.
 */

export function openPanel(panelId: PanelId, onOpened?: () => void): void {
  if (!isPanelId(panelId)) {
    throw new Error(
      `openPanel: unknown panel id "${panelId}". Valid ids: ${PANEL_IDS.join(", ")}`
    );
  }

  const { activePanel, activatePanel, deactivatePanel } = useEiraStore.getState();

  const activate = () => {
    activatePanel(panelId);
    onOpened?.();
    setTimeout(() => useEiraStore.getState().setState("success"), SUCCESS_DELAY_MS);
  };

  if (activePanel && activePanel !== panelId) {
    // Close the open panel first, then bring the new one forward — a clean
    // sequential swap instead of crossfading the two.
    deactivatePanel();
    setTimeout(activate, PANEL_SWITCH_DELAY_MS);
  } else {
    activate();
  }
}

export function closePanel(): void {
  useEiraStore.getState().deactivatePanel();
}
