import { create } from "zustand";

export type EiraState =
  | "idle"
  | "listening"
  | "thinking"
  | "speaking"
  | "executing"
  | "success"
  | "error";

export type PanelId = "bookings" | "tasks" | "traffic" | "ads" | "finance" | "almanac";

export const PANEL_IDS: PanelId[] = ["bookings", "tasks", "traffic", "ads", "finance", "almanac"];

export type Quality = "high" | "low";

interface EiraStore {
  state: EiraState;
  setState: (state: EiraState) => void;

  // Pure state only — no timing/sequencing. The public openPanel/closePanel
  // API that voice commands and (later) AI tool-calls use lives in
  // lib/jarvisActions.ts, built on top of these two primitives.
  activePanel: PanelId | null;
  activatePanel: (panel: PanelId) => void;
  deactivatePanel: () => void;

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
  activatePanel: (panel) => set({ activePanel: panel, state: "executing" }),
  deactivatePanel: () => set({ activePanel: null, state: "idle" }),

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
