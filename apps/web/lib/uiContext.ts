// Gives the AI backend a structured snapshot of what's actually on screen
// right now, so it can answer questions like "vad står det i Ekonomi?"
// without the user having to read the panel out loud. No screenshots/OCR —
// this reads the same React state (Zustand store) and mock data modules the
// dashboard components themselves render from.
import { useEiraStore } from "@/store/useEiraStore";
import { getPanelLayout } from "@/components/eira/panelLayout";
import { mockFinance, mockGoogleAds, mockCustomers, mockTasks, mockTraffic } from "./mockDashboardData";
import { mockGoogleAdsData } from "./mockGoogleAdsData";
import { mockFinanceData } from "./mockFinanceData";
import { getAllBookings, getPastBookings, getUpcomingBookings, bookingWeekStats } from "./mockBookingsData";

// One data source per panel id — mirrors exactly what PanelContent.tsx /
// GoogleAdsPanel.tsx / FinancePanel.tsx render, so "visible" always means
// "the same object the UI is currently showing," never a stale copy.
// A plain function, not a module-level constant, because bookings' past/
// upcoming split depends on the real clock at the moment of the request.
function getPanelData() {
  return {
    tasks: mockTasks,
    traffic: mockTraffic,
    bookings: {
      all: getAllBookings(),
      past: getPastBookings(),
      upcoming: getUpcomingBookings(),
      weekStats: bookingWeekStats,
    },
    ads: mockGoogleAdsData,
    finance: mockFinanceData,
  } as const;
}

export interface JarvisUIContext {
  /** Which panel, if any, the user currently has open full-screen. */
  activePanel: string | null;
  activePanelLabel: string | null;
  /** Jarvis's own voice/assistant state (idle, listening, thinking, ...). */
  assistantState: string;
  backendConnected: boolean;
  /** The always-visible top KPI strip (SystemStatus.tsx), on screen regardless of which panel is open. */
  systemStatus: {
    dagensJobb: number;
    omsattningMalProcent: number;
    aktivaAds: string;
    nyaKunder: number;
    viktigastIdag: string;
  };
  /** Full data for the currently open panel only — matches what's actually visible, not every panel that exists. */
  activePanelData: unknown;
}

/**
 * Snapshot of the JARVIS dashboard's current UI, safe to JSON-serialize and
 * send alongside a chat/voice request. Reads store state via getState()
 * (not the useX hook) so it can be called from plain functions, not just
 * components.
 */
export function getUIContext(): JarvisUIContext {
  const { activePanel, state } = useEiraStore.getState();

  return {
    activePanel,
    activePanelLabel: activePanel ? getPanelLayout(activePanel).label : null,
    assistantState: state,
    backendConnected: useEiraStore.getState().connected,
    systemStatus: {
      dagensJobb: getAllBookings().length,
      omsattningMalProcent: mockFinance.goalProgress,
      aktivaAds: mockGoogleAds.campaignStatus,
      nyaKunder: mockCustomers.newThisMonth,
      viktigastIdag: mockTasks.today[0]?.label ?? "—",
    },
    activePanelData: activePanel ? getPanelData()[activePanel] : null,
  };
}
