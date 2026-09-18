import type { PanelId } from "@/store/useEiraStore";

export interface PanelLayoutEntry {
  id: PanelId;
  label: string;
  /** Horizontal slot (-1 left .. 1 right) for the dormant background arrangement. */
  slotX: number;
  /** Direction the energy beam travels from the brain toward this panel. */
  beamDirection: [number, number, number];
}

export const PANEL_LAYOUT: PanelLayoutEntry[] = [
  { id: "google-ads", label: "Google Ads", slotX: -1, beamDirection: [-1, 0.15, -0.3] },
  { id: "customers", label: "Kunder", slotX: -0.6, beamDirection: [-0.5, 0.3, -0.5] },
  { id: "finance", label: "Ekonomi", slotX: -0.2, beamDirection: [-0.15, -0.25, -0.6] },
  { id: "tasks", label: "Uppgifter", slotX: 0.2, beamDirection: [0.15, 0.3, -0.6] },
  { id: "traffic", label: "Webbtrafik", slotX: 0.6, beamDirection: [0.5, -0.2, -0.5] },
  { id: "bookings", label: "Bokningar", slotX: 1, beamDirection: [1, 0.1, -0.3] },
];

export function getPanelLayout(id: PanelId): PanelLayoutEntry {
  return PANEL_LAYOUT.find((entry) => entry.id === id) ?? PANEL_LAYOUT[0];
}
