// Static prototype data for the Ekonomi (finance) command panel. Two
// genuinely different data sources are modeled explicitly and kept
// separate — the company's own sales tracking vs. what's actually booked
// in Fortnox — so a real Fortnox API integration can slot in later without
// the components needing to change shape.

export interface FinanceMonthPoint {
  /** Short display label, e.g. "Jun". */
  month: string;
  revenue: number;
  cost: number;
  result: number;
}

export interface FinanceData {
  meta: {
    status: string;
    period: string;
    dataLabel: string;
  };
  ownTracking: {
    totalEarned: number;
  };
  fortnox: {
    bookedRevenue: number;
    bookedCosts: number;
    resultJuneToAugust: number;
    resultSeptember: number;
    resultFiscalYear: number;
    registeredLiquidity: number;
    upcomingTax: number;
    liquidityWarningDate: string;
    connectionStatus: string;
  };
  chart: {
    points: FinanceMonthPoint[];
  };
  insight: string;
}

export const mockFinanceData: FinanceData = {
  meta: {
    status: "PROTOTYP AKTIV",
    period: "JUNI – SEPTEMBER 2026",
    dataLabel: "STATISK PROTOTYPDATA",
  },
  ownTracking: {
    totalEarned: 87000,
  },
  fortnox: {
    bookedRevenue: 56000,
    bookedCosts: 48000,
    resultJuneToAugust: -2700,
    resultSeptember: 11000,
    resultFiscalYear: 8400,
    registeredLiquidity: 8400,
    upcomingTax: 2598,
    liquidityWarningDate: "4 december 2026",
    connectionStatus: "EJ ANSLUTEN",
  },
  chart: {
    points: [
      { month: "Jun", revenue: 12000, cost: 13500, result: -1500 },
      { month: "Jul", revenue: 14000, cost: 14800, result: -800 },
      { month: "Aug", revenue: 16000, cost: 15600, result: 400 },
      { month: "Sep", revenue: 14000, cost: 3000, result: 11000 },
    ],
  },
  insight:
    "Företagets egen uppföljning visar 87 000 kr intjänat, medan 56 000 kr är bokfört i Fortnox. Skillnaden behöver stämmas av innan ekonomin kopplas automatiskt.",
};
