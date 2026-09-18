"use client";

import { useEiraStore } from "@/store/useEiraStore";
import { eiraTokens } from "@/lib/eiraTokens";
import { mockFinance, mockGoogleAds, mockCustomers, mockTasks, mockBookings } from "@/lib/mockDashboardData";

function Indicator({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", minWidth: 96 }}>
      <span style={{ fontSize: 10, letterSpacing: 1, opacity: 0.55, textTransform: "uppercase" }}>
        {label}
      </span>
      <span style={{ fontSize: 15, color: eiraTokens.energyWhite, fontWeight: 600 }}>{value}</span>
    </div>
  );
}

export function SystemStatus() {
  const connected = useEiraStore((s) => s.connected);

  return (
    <div
      style={{
        display: "flex",
        gap: 28,
        flexWrap: "wrap",
        fontFamily: "system-ui, sans-serif",
        color: eiraTokens.energyWhite,
      }}
    >
      <Indicator label="Dagens jobb" value={String(mockBookings.today.length)} />
      <Indicator
        label="Omsättning / mål"
        value={`${mockFinance.goalProgress}%`}
      />
      <Indicator label="Aktiva Ads" value={mockGoogleAds.campaignStatus} />
      <Indicator label="Nya kunder" value={String(mockCustomers.newThisMonth)} />
      <Indicator label="Viktigast idag" value={mockTasks.today[0]?.label ?? "—"} />
      <Indicator
        label="System"
        value={connected ? "Online" : "Ansluter…"}
      />
    </div>
  );
}
