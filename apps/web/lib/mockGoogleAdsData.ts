// Static prototype data for the Google Ads command-analytics panel. Shaped
// so a real Google Ads API integration can replace each section later
// without touching the components that render it — every value the panel
// displays reads from here, nothing is inlined in JSX.

export interface GoogleAdsChartPoint {
  /** Short display label, e.g. "20 aug". */
  date: string;
  clicks: number;
  impressions: number;
}

export interface GoogleAdsKeyword {
  keyword: string;
  cost: number;
  clicks: number;
  ctr: number;
  badge?: "BÄSTA CTR" | "STÖRSTA TRAFIKKÄLLA";
}

export interface GoogleAdsData {
  meta: {
    status: string;
    period: string;
    dataLabel: string;
  };
  kpis: {
    clicks: number;
    impressions: number;
    avgCpc: number;
    totalCost: number;
    ctr: number;
  };
  chart: {
    points: GoogleAdsChartPoint[];
  };
  marketSignal: {
    title: string;
    searchVolumeChangePct: number;
    myClicksChangePct: number;
    description: string;
    trend: number[];
    insight: string;
  };
  keywords: GoogleAdsKeyword[];
  performanceReport: string;
}

export const mockGoogleAdsData: GoogleAdsData = {
  meta: {
    status: "KAMPANJ AKTIV",
    period: "20 AUG – 18 SEP 2026",
    dataLabel: "STATISK PROTOTYPDATA",
  },
  kpis: {
    clicks: 48,
    impressions: 473,
    avgCpc: 52.28,
    totalCost: 2510,
    ctr: 10.15,
  },
  chart: {
    points: [
      { date: "20 aug", clicks: 2, impressions: 24 },
      { date: "24 aug", clicks: 3, impressions: 31 },
      { date: "28 aug", clicks: 4, impressions: 38 },
      { date: "1 sep", clicks: 3, impressions: 41 },
      { date: "5 sep", clicks: 5, impressions: 47 },
      { date: "9 sep", clicks: 6, impressions: 52 },
      { date: "12 sep", clicks: 7, impressions: 61 },
      { date: "15 sep", clicks: 9, impressions: 78 },
      { date: "18 sep", clicks: 9, impressions: 101 },
    ],
  },
  marketSignal: {
    title: "MARKNADSSIGNAL // UPPÅTGÅENDE",
    searchVolumeChangePct: 12,
    myClicksChangePct: 278,
    description: "Intresset för fönsterputs ökar jämfört med föregående månad.",
    trend: [2, 3, 3, 4, 5, 6, 8, 9],
    insight: "Dina klick växer betydligt snabbare än marknadens sökvolym.",
  },
  keywords: [
    {
      keyword: "fönsterputs jönköping",
      cost: 1707.89,
      clicks: 33,
      ctr: 8.66,
      badge: "STÖRSTA TRAFIKKÄLLA",
    },
    {
      keyword: "fönsterputs bankeryd",
      cost: 276.21,
      clicks: 5,
      ctr: 22.73,
      badge: "BÄSTA CTR",
    },
    { keyword: "fönsterputs huskvarna", cost: 154.15, clicks: 3, ctr: 16.67 },
    { keyword: "fönsterputs habo", cost: 107.58, clicks: 2, ctr: 11.11 },
    { keyword: "fönsterputsare", cost: 105.76, clicks: 2, ctr: 12.5 },
  ],
  performanceReport:
    "48 klick från 473 exponeringar ger en klickfrekvens på 10,15 %. Fönsterputs Jönköping driver mest trafik, medan Bankeryd har högst klickfrekvens.",
};
