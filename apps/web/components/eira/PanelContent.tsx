import type { PanelId } from "@/store/useEiraStore";
import { eiraTokens } from "@/lib/eiraTokens";
import { mockTasks, mockTraffic, mockBookings } from "@/lib/mockDashboardData";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, opacity: 0.6, letterSpacing: 0.5, textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ fontSize: 22, color: eiraTokens.energyWhite, fontWeight: 600 }}>{value}</div>
    </div>
  );
}

function StatRow({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>{children}</div>;
}

function MiniTrend({ points, color }: { points: number[]; color: string }) {
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const width = 200;
  const height = 44;
  const step = width / (points.length - 1);
  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${i * step},${height - ((p - min) / range) * height}`)
    .join(" ");

  return (
    <svg width={width} height={height} style={{ overflow: "visible" }}>
      <path d={path} fill="none" stroke={color} strokeWidth={2} opacity={0.85} />
    </svg>
  );
}

export function PanelContent({ panel }: { panel: PanelId }) {
  switch (panel) {
    // "ads" and "finance" are rendered by their own dedicated components
    // instead (see PanelStage) — they never reach this switch while active.
    case "tasks": {
      const d = mockTasks;
      return (
        <>
          <div>
            <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 6 }}>DAGENS UPPGIFTER</div>
            {d.today.map((t) => (
              <div
                key={t.id}
                style={{
                  fontSize: 14,
                  opacity: t.done ? 0.4 : 0.9,
                  textDecoration: t.done ? "line-through" : "none",
                }}
              >
                {t.label}
              </div>
            ))}
          </div>
          <div>
            <div style={{ fontSize: 11, color: eiraTokens.warning, marginBottom: 4, marginTop: 10 }}>
              BRÅDSKANDE
            </div>
            {d.urgent.map((u) => (
              <div key={u} style={{ fontSize: 14, opacity: 0.9 }}>
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
            <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 6 }}>MEST BESÖKTA SIDOR</div>
            {d.topPages.map((p) => (
              <div key={p.path} style={{ fontSize: 14, opacity: 0.85 }}>
                {p.path} — {p.views}
              </div>
            ))}
          </div>
          <MiniTrend points={d.trend} color={eiraTokens.contrastAccent} />
        </>
      );
    }
    case "bookings": {
      const d = mockBookings;
      return (
        <>
          <Stat label="Nästa jobb" value={`${d.nextJob.customer} — ${d.nextJob.time}`} />
          <div>
            <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 6, marginTop: 6 }}>
              DAGENS SCHEMA
            </div>
            {d.today.map((b) => (
              <div key={b.time} style={{ fontSize: 14, opacity: 0.85 }}>
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
