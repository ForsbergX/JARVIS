"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { eiraTokens } from "@/lib/eiraTokens";
import { closePanel } from "@/lib/jarvisActions";
import { mockFinanceData } from "@/lib/mockFinanceData";
import { FinanceChart } from "./FinanceChart";

// Deliberately more opaque than the shared panelBackground token — this
// panel is large enough to sit directly over the bright orb core, and its
// text needs guaranteed contrast regardless of what's glowing behind it.
// Other panels (which use eiraTokens.panelBackground) are untouched.
const FINANCE_PANEL_BACKGROUND = "rgba(7, 7, 9, 0.88)";

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

function useCountUp(target: number, durationMs: number, reducedMotion: boolean): number {
  const [value, setValue] = useState(reducedMotion ? target : 0);
  useEffect(() => {
    if (reducedMotion) {
      setValue(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    function tick(now: number) {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(target * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, durationMs, reducedMotion]);
  return value;
}

function sv(n: number, decimals = 0): string {
  return n.toLocaleString("sv-SE", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function signed(n: number): string {
  return `${n >= 0 ? "+" : "−"}${sv(Math.abs(n))}`;
}

interface KpiModuleProps {
  label: string;
  target: number;
  suffix?: string;
  color?: string;
  big?: boolean;
  formatSigned?: boolean;
  reducedMotion: boolean;
  delay: number;
}

function KpiModule({ label, target, suffix = " kr", color, big, formatSigned, reducedMotion, delay }: KpiModuleProps) {
  const value = useCountUp(target, reducedMotion ? 0 : 900, reducedMotion);
  const displayValue = formatSigned ? signed(value) : sv(value);
  return (
    <motion.div
      initial={{ opacity: 0, y: reducedMotion ? 0 : 10, scale: reducedMotion ? 1 : 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: reducedMotion ? 0 : 0.4, delay: reducedMotion ? 0 : delay }}
      style={{
        background: big ? "rgba(255, 22, 61, 0.08)" : "rgba(255, 22, 61, 0.07)",
        border: `1px solid ${big ? "rgba(255, 22, 61, 0.35)" : eiraTokens.panelBorder}`,
        borderRadius: 12,
        padding: big ? "18px 20px" : "14px 16px",
        gridColumn: big ? "span 2" : undefined,
      }}
    >
      <div
        style={{
          fontSize: big ? 13 : 12.5,
          letterSpacing: 0.6,
          textTransform: "uppercase",
          opacity: 0.6,
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: big ? 40 : 32,
          fontWeight: 600,
          fontVariantNumeric: "tabular-nums",
          color: color ?? eiraTokens.energyWhite,
          textShadow: "none",
        }}
      >
        {displayValue}
        {suffix}
      </div>
    </motion.div>
  );
}

function StatusModule({
  label,
  value,
  color,
  reducedMotion,
  delay,
}: {
  label: string;
  value: string;
  color: string;
  reducedMotion: boolean;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: reducedMotion ? 0 : 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reducedMotion ? 0 : 0.35, delay: reducedMotion ? 0 : delay }}
      style={{
        border: `1px solid ${eiraTokens.panelBorder}`,
        borderRadius: 10,
        padding: "12px 14px",
        background: "rgba(255, 22, 61, 0.05)",
      }}
    >
      <div style={{ fontSize: 11.5, letterSpacing: 0.6, opacity: 0.6, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 600, color, fontVariantNumeric: "tabular-nums" }}>{value}</div>
    </motion.div>
  );
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

const sectionStyle: React.CSSProperties = {
  borderTop: `1px solid ${eiraTokens.panelBorder}`,
  paddingTop: 20,
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 13,
  letterSpacing: 1,
  color: eiraTokens.contrastAccent,
  marginBottom: 14,
  opacity: 0.9,
};

interface FinancePanelProps {
  active: boolean;
}

export function FinancePanel({ active }: FinancePanelProps) {
  const reducedMotion = useReducedMotion();
  const isSmallScreen = useMediaQuery("(max-width: 768px)");
  const data = mockFinanceData;

  const restOffsetX = reducedMotion ? 0 : 24;

  return (
    // Always mounted — toggled purely via the `animate` prop (like
    // HologramPanel), never via AnimatePresence/exit. In this project's
    // Framer Motion setup, animation-completion callbacks (onAnimationComplete,
    // AnimatePresence's onExitComplete) never fire even for a trivial,
    // always-mounted motion.div completely unrelated to this panel — so
    // anything that waits on an exit-completion signal hangs forever and the
    // panel never actually unmounts. Toggling `animate` has no such
    // dependency: the values themselves just interpolate.
    //
    // Static positioning wrapper below — plain CSS transform, never animated,
    // so percentage centering doesn't fight with the animated `scale`.
    // Centered on every screen size (not just mobile) so the panel frames
    // Eira/the orb instead of pushing her toward the right edge — the orb's
    // own camera no longer offsets for an active panel either (EiraScene).
    <div
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        width: isSmallScreen ? "92vw" : "clamp(720px, 48vw, 920px)",
        // 520 was sized for a desktop viewport — on a phone-height screen it
        // forces the panel to ~93% of the viewport regardless of maxHeight,
        // leaving almost no clearance above it (the mini orb bubble that
        // floats there when a panel is open on mobile ended up overlapping
        // this panel's own close button as a result).
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
          background: FINANCE_PANEL_BACKGROUND,
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
            <CornerMarker
              reducedMotion={reducedMotion}
              style={{ top: 10, left: 10, borderTop: "2px solid", borderLeft: "2px solid" }}
            />
            <CornerMarker
              reducedMotion={reducedMotion}
              style={{ top: 10, right: 10, borderTop: "2px solid", borderRight: "2px solid" }}
            />
            <CornerMarker
              reducedMotion={reducedMotion}
              style={{ bottom: 10, left: 10, borderBottom: "2px solid", borderLeft: "2px solid" }}
            />
            <CornerMarker
              reducedMotion={reducedMotion}
              style={{ bottom: 10, right: 10, borderBottom: "2px solid", borderRight: "2px solid" }}
            />
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
              EKONOMI // FINANCIAL COMMAND
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
              <span>{data.meta.status}</span>
              <span style={{ opacity: 0.4 }}>·</span>
              <span style={{ fontVariantNumeric: "tabular-nums", opacity: 0.75 }}>{data.meta.period}</span>
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
          {data.meta.dataLabel} · Fortnox API ännu inte ansluten
        </div>

        <div
          style={{
            position: "relative",
            zIndex: 3,
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            padding: "4px 26px 26px 26px",
            display: "flex",
            flexDirection: "column",
            gap: 26,
          }}
        >
          {active && (
          <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16 }}>
            <KpiModule
              label="Totalt intjänat"
              target={data.ownTracking.totalEarned}
              color={eiraTokens.contrastAccent}
              big
              reducedMotion={reducedMotion}
              delay={0.05}
            />
            <KpiModule
              label="Bokförd omsättning"
              target={data.fortnox.bookedRevenue}
              color={eiraTokens.accentBright}
              reducedMotion={reducedMotion}
              delay={0.1}
            />
            <KpiModule
              label="Kostnader"
              target={data.fortnox.bookedCosts}
              color="#9b9ba5"
              reducedMotion={reducedMotion}
              delay={0.15}
            />
            <KpiModule
              label="Resultat RÅ"
              target={data.fortnox.resultFiscalYear}
              color={eiraTokens.success}
              formatSigned
              reducedMotion={reducedMotion}
              delay={0.2}
            />
            <KpiModule
              label="Septemberresultat"
              target={data.fortnox.resultSeptember}
              color={eiraTokens.success}
              formatSigned
              reducedMotion={reducedMotion}
              delay={0.25}
            />
          </div>

          <div
            style={{
              background: "rgba(255, 22, 61, 0.06)",
              border: "1px solid rgba(255, 22, 61, 0.25)",
              borderRadius: 10,
              padding: "12px 16px",
              fontSize: 13.5,
              lineHeight: 1.5,
              opacity: 0.85,
            }}
          >
            &ldquo;Totalt intjänat&rdquo; är företagets egen försäljningsuppföljning. &ldquo;Bokförd
            omsättning&rdquo; är summan som för närvarande är registrerad i Fortnox. Det är två olika
            datakällor och slås inte ihop.
          </div>

          <section style={sectionStyle}>
            <div style={sectionTitleStyle}>INTÄKTER // KOSTNADER // RESULTAT</div>
            <FinanceChart points={data.chart.points} reducedMotion={reducedMotion} />
          </section>

          <section style={sectionStyle}>
            <div style={sectionTitleStyle}>FORTNOX STATUS</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
              <StatusModule
                label="Registrerad likviditet"
                value={`${sv(data.fortnox.registeredLiquidity)} kr`}
                color={eiraTokens.energyWhite}
                reducedMotion={reducedMotion}
                delay={0.1}
              />
              <StatusModule
                label="Kommande skatt"
                value={`${sv(data.fortnox.upcomingTax)} kr`}
                color="#9b9ba5"
                reducedMotion={reducedMotion}
                delay={0.15}
              />
              <StatusModule
                label="Likviditetsvarning"
                value={data.fortnox.liquidityWarningDate}
                color={eiraTokens.warning}
                reducedMotion={reducedMotion}
                delay={0.2}
              />
              <StatusModule
                label="Fortnox-anslutning"
                value={data.fortnox.connectionStatus}
                color={eiraTokens.warning}
                reducedMotion={reducedMotion}
                delay={0.25}
              />
            </div>
          </section>

          <div
            style={{
              background: "rgba(255, 22, 61, 0.06)",
              border: "1px solid rgba(255, 22, 61, 0.3)",
              borderRadius: 10,
              padding: "14px 16px",
            }}
          >
            <div style={{ fontSize: 11.5, letterSpacing: 1, color: eiraTokens.contrastAccent, marginBottom: 6 }}>
              JARVIS INSIGHT
            </div>
            <div style={{ fontSize: 15, fontStyle: "italic", opacity: 0.9 }}>&ldquo;{data.insight}&rdquo;</div>
          </div>
          </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
