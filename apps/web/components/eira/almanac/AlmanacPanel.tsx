"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { eiraTokens } from "@/lib/eiraTokens";
import { closePanel } from "@/lib/jarvisActions";
import { ALMANAC_ENTRIES } from "@/lib/almanacData";

// Same deliberately-more-opaque background as FinancePanel/GoogleAdsPanel —
// this panel is large enough to sit directly over the bright orb core.
const ALMANAC_PANEL_BACKGROUND = "rgba(7, 7, 9, 0.88)";

const WEEKDAY_LABELS = ["M", "T", "O", "T", "F", "L", "S"];
const MONTH_NAMES = [
  "Januari", "Februari", "Mars", "April", "Maj", "Juni",
  "Juli", "Augusti", "September", "Oktober", "November", "December",
];

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}

function useReducedMotion(): boolean {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** Always 42 cells (6 full Mon-Sun weeks) covering the given month, plus
 * whatever leading/trailing days from adjacent months fill the grid — the
 * same shape a normal calendar month view uses. */
function getMonthGrid(year: number, month: number): { date: Date; inMonth: boolean }[] {
  const firstOfMonth = new Date(year, month, 1);
  const mondayIndex = (firstOfMonth.getDay() + 6) % 7; // 0=Mon..6=Sun
  const gridStart = new Date(year, month, 1 - mondayIndex);

  const cells: { date: Date; inMonth: boolean }[] = [];
  for (let i = 0; i < 42; i++) {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + i);
    cells.push({ date, inMonth: date.getMonth() === month });
  }
  return cells;
}

function CornerMarker({ style, reducedMotion }: { style: React.CSSProperties; reducedMotion: boolean }) {
  return (
    <motion.div
      animate={reducedMotion ? { opacity: 0.6 } : { opacity: [0.35, 0.9, 0.35] }}
      transition={reducedMotion ? undefined : { duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
      style={{
        position: "absolute",
        width: 18,
        height: 18,
        borderColor: eiraTokens.contrastAccent,
        zIndex: 2,
        pointerEvents: "none",
        ...style,
      }}
    />
  );
}

interface AlmanacPanelProps {
  active: boolean;
}

export function AlmanacPanel({ active }: AlmanacPanelProps) {
  const reducedMotion = useReducedMotion();
  const isSmallScreen = useMediaQuery("(max-width: 768px)");
  const restOffsetX = reducedMotion ? 0 : 24;

  // Defaults to the earliest month that actually has data (see
  // almanacData.ts) rather than the real current month, which would open
  // on an empty grid — "‹ ›" below still navigates freely either way.
  const [viewYear, setViewYear] = useState(2027);
  const [viewMonth, setViewMonth] = useState(7); // 0-indexed: 7 = August

  const cells = useMemo(() => getMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);
  const today = useMemo(() => new Date(), []);

  function goToPrevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function goToNextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  return (
    // Same always-mounted + active-prop pattern as every other dedicated
    // panel (see FinancePanel.tsx) — never AnimatePresence/exit.
    <div
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        width: isSmallScreen ? "92vw" : "clamp(720px, 48vw, 920px)",
        minHeight: isSmallScreen ? 320 : 520,
        maxHeight: "75vh",
        zIndex: 25,
        transform: "translate(-50%, -50%)",
      }}
    >
      <motion.div
        initial={false}
        animate={{
          opacity: active ? 1 : 0,
          scale: active ? 1 : 0.94,
          x: active ? 0 : restOffsetX,
        }}
        transition={{ type: "spring", stiffness: 120, damping: 18, mass: 0.9 }}
        style={{
          width: "100%",
          height: "100%",
          maxHeight: "75vh",
          pointerEvents: active ? "auto" : "none",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          background: ALMANAC_PANEL_BACKGROUND,
          border: `1px solid ${eiraTokens.panelBorder}`,
          borderRadius: 6,
          backdropFilter: "blur(14px)",
          boxShadow: `0 0 20px ${eiraTokens.accentPrimary}22, inset 0 0 1px ${eiraTokens.accentBright}, inset 0 0 60px rgba(255, 22, 61, 0.04)`,
          color: eiraTokens.energyWhite,
          fontFamily: "var(--font-command)",
          overflow: "hidden",
          backgroundImage:
            "linear-gradient(rgba(255, 22, 61, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 22, 61, 0.05) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      >
        {active && (
          <>
            <CornerMarker reducedMotion={reducedMotion} style={{ top: 10, left: 10, borderTop: "2px solid", borderLeft: "2px solid" }} />
            <CornerMarker reducedMotion={reducedMotion} style={{ top: 10, right: 10, borderTop: "2px solid", borderRight: "2px solid" }} />
            <CornerMarker reducedMotion={reducedMotion} style={{ bottom: 10, left: 10, borderBottom: "2px solid", borderLeft: "2px solid" }} />
            <CornerMarker reducedMotion={reducedMotion} style={{ bottom: 10, right: 10, borderBottom: "2px solid", borderRight: "2px solid" }} />
          </>
        )}

        <div
          style={{
            position: "relative",
            zIndex: 3,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            padding: "22px 26px 0 26px",
            flexShrink: 0,
          }}
        >
          <div>
            <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: 1, color: eiraTokens.accentBright }}>
              ALMANACKA // MÅNADSSCHEMA
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, fontSize: 13, opacity: 0.85 }}>
              <motion.span
                animate={reducedMotion ? { opacity: 1 } : { opacity: [0.6, 1, 0.6] }}
                transition={reducedMotion ? undefined : { duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: eiraTokens.contrastAccent,
                  boxShadow: `0 0 8px ${eiraTokens.contrastAccent}`,
                }}
              />
              <span>SCHEMA AKTIVT</span>
            </div>
          </div>
          <button
            type="button"
            aria-label="Stäng panelen"
            onClick={() => closePanel()}
            style={{
              background: "transparent",
              border: `1px solid ${eiraTokens.panelBorder}`,
              color: eiraTokens.energyWhite,
              width: 32,
              height: 32,
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 14,
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>
        <div
          style={{
            position: "relative",
            zIndex: 3,
            padding: "6px 26px 14px 26px",
            fontSize: 11,
            letterSpacing: 1.2,
            color: eiraTokens.warning,
            opacity: 0.8,
            flexShrink: 0,
          }}
        >
          ÖVERFÖRT FRÅN GOOGLE KALENDER · LOKAL DATA
        </div>

        <div
          style={{
            position: "relative",
            zIndex: 3,
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            padding: "4px 26px 26px 26px",
          }}
        >
          {active && (
            <>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 14,
                }}
              >
                <button
                  type="button"
                  aria-label="Föregående månad"
                  onClick={goToPrevMonth}
                  style={{
                    background: "rgba(255, 22, 61, 0.08)",
                    border: `1px solid ${eiraTokens.panelBorder}`,
                    color: eiraTokens.energyWhite,
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    cursor: "pointer",
                    fontSize: 14,
                  }}
                >
                  ‹
                </button>
                <div style={{ fontSize: isSmallScreen ? 14 : 16, letterSpacing: 1, color: eiraTokens.contrastAccent }}>
                  {MONTH_NAMES[viewMonth]} {viewYear}
                </div>
                <button
                  type="button"
                  aria-label="Nästa månad"
                  onClick={goToNextMonth}
                  style={{
                    background: "rgba(255, 22, 61, 0.08)",
                    border: `1px solid ${eiraTokens.panelBorder}`,
                    color: eiraTokens.energyWhite,
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    cursor: "pointer",
                    fontSize: 14,
                  }}
                >
                  ›
                </button>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(7, 1fr)",
                  gap: 1,
                  marginBottom: 4,
                }}
              >
                {WEEKDAY_LABELS.map((label, i) => (
                  <div
                    key={`${label}-${i}`}
                    style={{
                      fontSize: 10.5,
                      letterSpacing: 0.5,
                      opacity: 0.5,
                      textAlign: "center",
                      padding: "2px 0",
                    }}
                  >
                    {label}
                  </div>
                ))}
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(7, 1fr)",
                  gap: 3,
                }}
              >
                {cells.map(({ date, inMonth }) => {
                  const dayEntries = ALMANAC_ENTRIES.filter((entry) => entry.date === isoDate(date));
                  const isToday = isSameDay(date, today);
                  return (
                    <div
                      key={date.toISOString()}
                      style={{
                        minHeight: isSmallScreen ? 46 : 62,
                        borderRadius: 6,
                        border: `1px solid ${dayEntries.length > 0 ? "rgba(255, 22, 61, 0.35)" : "rgba(255, 22, 61, 0.1)"}`,
                        background: dayEntries.length > 0 ? "rgba(255, 22, 61, 0.08)" : "transparent",
                        opacity: inMonth ? 1 : 0.35,
                        padding: "3px 4px",
                        boxSizing: "border-box",
                      }}
                    >
                      <div
                        style={{
                          fontSize: isSmallScreen ? 10.5 : 11.5,
                          width: 18,
                          height: 18,
                          lineHeight: "18px",
                          textAlign: "center",
                          borderRadius: "50%",
                          background: isToday ? eiraTokens.accentPrimary : "transparent",
                          color: isToday ? eiraTokens.energyWhite : undefined,
                          opacity: isToday ? 1 : 0.75,
                        }}
                      >
                        {date.getDate()}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 2 }}>
                        {dayEntries.map((entry, i) => (
                          <div
                            key={`${entry.date}-${i}`}
                            title={entry.title}
                            style={{
                              fontSize: isSmallScreen ? 8.5 : 9.5,
                              lineHeight: 1.2,
                              color: eiraTokens.accentBright,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {entry.title}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
