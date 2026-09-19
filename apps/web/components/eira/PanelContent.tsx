import type { PanelId } from "@/store/useEiraStore";
import { eiraTokens } from "@/lib/eiraTokens";
import { mockTasks, mockTraffic } from "@/lib/mockDashboardData";
import { getPastBookings, getNextBookings, bookingWeekStats, type BookingJob } from "@/lib/mockBookingsData";

// Not part of eiraTokens — that shared success color isn't visually green
// (Finance/GoogleAds already rely on its current pale value), and this is
// the one spot in the app that needs an actual green "completed" mark.
const COMPLETED_GREEN = "#34d97a";

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

/** One card in the "KOMMANDE JOBB" priority queue — rank 0 (the very next
 * job) gets the strongest visual weight, the next two are still clearly
 * highlighted but a step down. Only shows fields that actually exist on the
 * job (location/service/price are absent from the current mock data). */
function PriorityJobCard({ job, rank }: { job: BookingJob; rank: number }) {
  const isNext = rank === 0;
  const hasExtra = Boolean(job.location || job.service || job.price !== undefined);
  return (
    <div
      style={{
        border: `1px solid ${isNext ? eiraTokens.accentBright : "rgba(255, 22, 61, 0.35)"}`,
        background: isNext ? "rgba(255, 22, 61, 0.14)" : "rgba(255, 22, 61, 0.05)",
        borderRadius: 6,
        padding: isNext ? "10px 12px" : "7px 10px",
        boxShadow: isNext ? `0 0 14px ${eiraTokens.accentPrimary}30` : "none",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
        <div style={{ fontSize: isNext ? 15 : 13, fontWeight: 600, color: eiraTokens.energyWhite }}>
          {job.customer}
        </div>
        <div
          style={{
            fontSize: isNext ? 13 : 11.5,
            color: eiraTokens.accentBright,
            opacity: 0.9,
            whiteSpace: "nowrap",
          }}
        >
          {job.dateLabel} · {job.timeLabel}
        </div>
      </div>
      {isNext && (
        <div style={{ fontSize: 10, letterSpacing: 1, color: eiraTokens.accentBright, opacity: 0.75, marginTop: 2 }}>
          NÄSTA JOBB
        </div>
      )}
      {hasExtra && (
        <div style={{ fontSize: 11.5, opacity: 0.7, marginTop: 4, display: "flex", gap: 10, flexWrap: "wrap" }}>
          {job.location && <span>{job.location}</span>}
          {job.service && <span>{job.service}</span>}
          {job.price !== undefined && <span>{job.price.toLocaleString("sv-SE")} kr</span>}
        </div>
      )}
    </div>
  );
}

/** A single compact line for a completed job — kept small/dense on purpose
 * so past jobs never dominate the panel next to the upcoming queue. */
function PastJobRow({ job }: { job: BookingJob }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 8,
        fontSize: 12,
        opacity: 0.75,
      }}
    >
      <span>{job.customer}</span>
      <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <span style={{ opacity: 0.7 }}>
          {job.dateLabel} · {job.timeLabel}
        </span>
        <span style={{ color: COMPLETED_GREEN, fontWeight: 600 }}>✓ AVKLARAD</span>
      </span>
    </div>
  );
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
      // Same functions Eira's voice briefing uses for "öppna bokningar" —
      // one source of truth, computed live from the real clock each render.
      const upcoming = getNextBookings(3);
      const past = getPastBookings();
      return (
        <>
          <div>
            <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 8, letterSpacing: 0.5 }}>
              KOMMANDE JOBB
            </div>
            {upcoming.length === 0 ? (
              <div style={{ fontSize: 13, opacity: 0.6 }}>Inga kommande bokningar just nu.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {upcoming.map((job, index) => (
                  <PriorityJobCard key={job.id} job={job} rank={index} />
                ))}
              </div>
            )}
          </div>

          {past.length > 0 && (
            <div>
              <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 6, marginTop: 4, letterSpacing: 0.5 }}>
                TIDIGARE JOBB
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {past.map((job) => (
                  <PastJobRow key={job.id} job={job} />
                ))}
              </div>
            </div>
          )}

          <StatRow>
            <Stat label="Veckans bokningar" value={String(bookingWeekStats.weekCount)} />
            <Stat
              label="Beräknat värde"
              value={`${bookingWeekStats.estimatedValue.toLocaleString("sv-SE")} kr`}
            />
          </StatRow>
        </>
      );
    }
    default:
      return null;
  }
}
