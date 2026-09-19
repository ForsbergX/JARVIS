// Local mock data only — no external Google Ads, Analytics, Fortnox, or
// other API integrations. Shaped so real API calls can replace this later
// without touching the panel components.

export const mockGoogleAds = {
  budgetToday: 400,
  currency: "kr",
  clicks: 27,
  conversions: 10,
  conversionRate: 37.0,
  costPerConversion: 40,
  campaignStatus: "Aktiv" as const,
  trend: [12, 18, 14, 22, 19, 27, 24],
};

export const mockCustomers = {
  total: 184,
  returning: 126,
  newThisMonth: 14,
  latest: [
    { name: "Anna Bergström", since: "2 dagar sedan" },
    { name: "Erik Lindqvist", since: "4 dagar sedan" },
    { name: "Sofia Karlsson", since: "1 vecka sedan" },
  ],
  upcomingFollowUps: [
    { name: "Marcus Holm", date: "Imorgon" },
    { name: "Lina Ekström", date: "Fredag" },
  ],
};

export const mockFinance = {
  revenue: 68400,
  companyAccount: 142300,
  goal: 100000,
  goalProgress: 68.4,
  currency: "kr",
  latestIncome: [
    { label: "Faktura #2291", amount: 12400 },
    { label: "Faktura #2290", amount: 8600 },
    { label: "Faktura #2288", amount: 15200 },
  ],
  trend: [41000, 48500, 52300, 59800, 61200, 68400],
};

export const mockTasks = {
  today: [
    { id: "t1", label: "Ring upp Marcus Holm", done: false },
    { id: "t2", label: "Skicka offert till Sofia K.", done: false },
    { id: "t3", label: "Godkänn ny Google Ads-kampanj", done: true },
  ],
  importantFollowUps: [
    "Kontrakt väntar signatur — Bergström AB",
  ],
  urgent: [
    "Fortnox-synk pausad sedan igår",
  ],
  completedCount: 6,
};

export const mockTraffic = {
  visitors: 2841,
  formConversions: 62,
  topPages: [
    { path: "/tjanster", views: 940 },
    { path: "/", views: 812 },
    { path: "/kontakt", views: 401 },
  ],
  sources: [
    { name: "Google", share: 54 },
    { name: "Direkt", share: 28 },
    { name: "Social", share: 18 },
  ],
  trend: [1900, 2100, 2400, 2600, 2500, 2841],
};

// Booking/job data moved to mockBookingsData.ts — it needs real Date-based
// past/upcoming logic (see getAllBookings/getPastBookings/getUpcomingBookings
// there), which doesn't fit this file's plain-object-per-panel shape.
