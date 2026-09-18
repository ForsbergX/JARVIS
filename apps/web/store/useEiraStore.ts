import { create } from "zustand";

export type EiraState =
  | "idle"
  | "listening"
  | "thinking"
  | "speaking"
  | "executing"
  | "success"
  | "error";

export type PanelId =
  | "google-ads"
  | "customers"
  | "finance"
  | "tasks"
  | "traffic"
  | "bookings";

export const PANEL_IDS: PanelId[] = [
  "google-ads",
  "customers",
  "finance",
  "tasks",
  "traffic",
  "bookings",
];

export type Quality = "high" | "low";

interface EiraStore {
  state: EiraState;
  setState: (state: EiraState) => void;

  activePanel: PanelId | null;
  openPanel: (panel: PanelId) => void;
  closePanel: () => void;

  transcript: string;
  setTranscript: (text: string) => void;

  connected: boolean;
  setConnected: (connected: boolean) => void;

  micSupported: boolean;
  setMicSupported: (supported: boolean) => void;

  voiceEnabled: boolean;
  setVoiceEnabled: (enabled: boolean) => void;

  lastMessage: string;
  setLastMessage: (text: string) => void;

  quality: Quality;
  setQuality: (quality: Quality) => void;
}

export const useEiraStore = create<EiraStore>((set) => ({
  state: "idle",
  setState: (state) => set({ state }),

  activePanel: null,
  openPanel: (panel) => set({ activePanel: panel, state: "executing" }),
  closePanel: () => set({ activePanel: null, state: "idle" }),

  transcript: "",
  setTranscript: (transcript) => set({ transcript }),

  connected: false,
  setConnected: (connected) => set({ connected }),

  micSupported: true,
  setMicSupported: (micSupported) => set({ micSupported }),

  voiceEnabled: true,
  setVoiceEnabled: (voiceEnabled) => set({ voiceEnabled }),

  lastMessage: "",
  setLastMessage: (lastMessage) => set({ lastMessage }),

  quality: "high",
  setQuality: (quality) => set({ quality }),
}));
