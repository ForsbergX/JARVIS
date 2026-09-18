import type { PanelId } from "@/store/useEiraStore";
import { eiraTokens } from "@/lib/eiraTokens";
import {
  mockGoogleAds,
  mockFinance,
  mockTasks,
  mockTraffic,
  mockBookings,
} from "@/lib/mockDashboardData";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div
        style={{
          fontSize: 13,
          opacity: 0.6,
          letterSpacing: 0.5,
          textTransform: "uppercase",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 34, color: eiraTokens.energyWhite, fontWeight: 600 }}>{value}</div>
    </div>
  );
}

function StatRow({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "flex", gap: 36, flexWrap: "wrap" }}>{children}</div>;
}

function MiniTrend({ points, color }: { points: number[]; color: string }) {
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const width = 260;
  const height = 56;
  const step = width / (points.length - 1);
  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${i * step},${height - ((p - min) / range) * height}`)
    .join(" ");

  return (
    <svg width={width} height={height} style={{ overflow: "visible" }}>
      <path d={path} fill="none" stroke={color} strokeWidth={2.5} opacity={0.85} />
    </svg>
  );
}

export function PanelContent({ panel }: { panel: PanelId }) {
  switch (panel) {
    case "ads": {
      const d = mockGoogleAds;
      return (
        <>
          <StatRow>
            <Stat label="Budget idag" value={`${d.budgetToday} ${d.currency}`} />
            <Stat label="Klick" value={String(d.clicks)} />
            <Stat label="Konverteringar" value={String(d.conversions)} />
          </StatRow>
          <StatRow>
            <Stat label="Konverteringsgrad" value={`${d.conversionRate}%`} />
            <Stat label="Kostnad / konvertering" value={`${d.costPerConversion} ${d.currency}`} />
            <Stat label="Status" value={d.campaignStatus} />
          </StatRow>
          <MiniTrend points={d.trend} color={eiraTokens.cyanAccent} />
        </>
      );
    }
    case "finance": {
      const d = mockFinance;
      return (
        <>
          <StatRow>
            <Stat label="Omsättning" value={`${d.revenue.toLocaleString("sv-SE")} ${d.currency}`} />
            <Stat label="Företagskonto" value={`${d.companyAccount.toLocaleString("sv-SE")} ${d.currency}`} />
            <Stat label="Mål" value={`${d.goal.toLocaleString("sv-SE")} ${d.currency}`} />
          </StatRow>
          <div>
            <div style={{ fontSize: 13, opacity: 0.6, marginBottom: 8 }}>
              MÅLUPPFYLLELSE {d.goalProgress}%
            </div>
            <div style={{ width: 320, height: 8, background: "rgba(255,255,255,0.1)", borderRadius: 4 }}>
              <div
                style={{
                  width: `${d.goalProgress}%`,
                  height: "100%",
                  background: eiraTokens.violetBright,
                  borderRadius: 4,
                }}
              />
            </div>
          </div>
          <MiniTrend points={d.trend} color={eiraTokens.violetBright} />
        </>
      );
    }
    case "tasks": {
      const d = mockTasks;
      return (
        <>
          <div>
            <div style={{ fontSize: 13, opacity: 0.6, marginBottom: 10 }}>DAGENS UPPGIFTER</div>
            {d.today.map((t) => (
              <div
                key={t.id}
                style={{
                  fontSize: 16,
                  opacity: t.done ? 0.4 : 0.9,
                  textDecoration: t.done ? "line-through" : "none",
                  marginBottom: 6,
                }}
              >
                {t.label}
              </div>
            ))}
          </div>
          <div>
            <div style={{ fontSize: 13, color: eiraTokens.warning, marginBottom: 8, marginTop: 16 }}>
              BRÅDSKANDE
            </div>
            {d.urgent.map((u) => (
              <div key={u} style={{ fontSize: 16, opacity: 0.9, marginBottom: 6 }}>
                {u}
              </div>
            ))}
          </div>
          <Stat label="Slutförda" value={String(d.completedCount)} />
        </>
      );
    }
    case "traffic": {
      const d = mockTraffic;
      return (
        <>
          <StatRow>
            <Stat label="Besökare" value={d.visitors.toLocaleString("sv-SE")} />
            <Stat label="Formulärkonverteringar" value={String(d.formConversions)} />
          </StatRow>
          <div>
            <div style={{ fontSize: 13, opacity: 0.6, marginBottom: 10 }}>MEST BESÖKTA SIDOR</div>
            {d.topPages.map((p) => (
              <div key={p.path} style={{ fontSize: 16, opacity: 0.85, marginBottom: 6 }}>
                {p.path} — {p.views}
              </div>
            ))}
          </div>
          <MiniTrend points={d.trend} color={eiraTokens.cyanAccent} />
        </>
      );
    }
    case "bookings": {
      const d = mockBookings;
      return (
        <>
          <Stat label="Nästa jobb" value={`${d.nextJob.customer} — ${d.nextJob.time}`} />
          <div>
            <div style={{ fontSize: 13, opacity: 0.6, marginBottom: 10, marginTop: 10 }}>
              DAGENS SCHEMA
            </div>
            {d.today.map((b) => (
              <div key={b.time} style={{ fontSize: 16, opacity: 0.85, marginBottom: 6 }}>
                {b.time} — {b.customer}
              </div>
            ))}
          </div>
          <StatRow>
            <Stat label="Veckans bokningar" value={String(d.weekCount)} />
            <Stat label="Beräknat värde" value={`${d.estimatedValue.toLocaleString("sv-SE")} kr`} />
          </StatRow>
        </>
      );
    }
    default:
      return null;
  }
}
