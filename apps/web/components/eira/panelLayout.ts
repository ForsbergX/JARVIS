import type { PanelId } from "@/store/useEiraStore";

export interface PanelLayoutEntry {
  id: PanelId;
  label: string;
  /** Short descriptive line shown on the dormant card, under the label. */
  subtitle: string;
  /** Horizontal slot (-1 left .. 1 right) for the dormant background arrangement. */
  slotX: number;
  /** Direction the energy beam travels from the brain toward this panel. */
  beamDirection: [number, number, number];
}

// slotX values are evenly spaced across the same -0.8..0.8 span used for 5
// cards (step 1.6/5 = 0.32) now that a 6th panel (almanac) joined them —
// keeps the outermost cards (ads/almanac) at the same edge positions as
// before, just tightens the middle four slightly.
export const PANEL_LAYOUT: PanelLayoutEntry[] = [
  {
    id: "ads",
    label: "Google Ads",
    subtitle: "Kampanjer, klick och sökord",
    slotX: -0.8,
    beamDirection: [-1, 0.15, -0.3],
  },
  {
    id: "finance",
    label: "Ekonomi",
    subtitle: "Omsättning, resultat och Fortnox",
    slotX: -0.48,
    beamDirection: [-0.15, -0.25, -0.6],
  },
  {
    id: "tasks",
    label: "Uppgifter",
    subtitle: "Prioriteringar och att göra",
    slotX: -0.16,
    beamDirection: [0.15, 0.3, -0.6],
  },
  {
    id: "traffic",
    label: "Webbtrafik",
    subtitle: "Google Analytics och sidaktivitet",
    slotX: 0.16,
    beamDirection: [0.5, -0.2, -0.5],
  },
  {
    id: "bookings",
    label: "Bokningar",
    subtitle: "Dagens schema och kommande jobb",
    slotX: 0.48,
    beamDirection: [1, 0.1, -0.3],
  },
  {
    id: "almanac",
    label: "Almanacka",
    subtitle: "Månadsschema med bokade jobb",
    slotX: 0.8,
    beamDirection: [1, -0.15, -0.2],
  },
];

export function getPanelLayout(id: PanelId): PanelLayoutEntry {
  return PANEL_LAYOUT.find((entry) => entry.id === id) ?? PANEL_LAYOUT[0];
}
