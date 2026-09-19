"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { eiraTokens } from "@/lib/eiraTokens";
import { closePanel } from "@/lib/jarvisActions";
import { mockGoogleAdsData } from "@/lib/mockGoogleAdsData";
import { GoogleAdsChart } from "./GoogleAdsChart";
import { GoogleAdsKeywordTable } from "./GoogleAdsKeywordTable";

// Deliberately more opaque than the shared panelBackground token — this
// panel is large enough to sit directly over the bright orb core, and its
// text needs guaranteed contrast regardless of what's glowing behind it.
// Other panels (which use eiraTokens.panelBackground) are untouched.
const ADS_PANEL_BACKGROUND = "rgba(7, 7, 9, 0.88)";

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

interface KpiModuleProps {
  label: string;
  target: number;
  decimals?: number;
  suffix?: string;
  reducedMotion: boolean;
  delay: number;
}

function KpiModule({ label, target, decimals = 0, suffix = "", reducedMotion, delay }: KpiModuleProps) {
  const value = useCountUp(target, reducedMotion ? 0 : 900, reducedMotion);
  return (
    <motion.div
      initial={{ opacity: 0, y: reducedMotion ? 0 : 10, scale: reducedMotion ? 1 : 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: reducedMotion ? 0 : 0.4, delay: reducedMotion ? 0 : delay }}
      style={{
        background: "rgba(255, 22, 61, 0.07)",
        border: `1px solid ${eiraTokens.panelBorder}`,
        borderRadius: 12,
        padding: "14px 16px",
      }}
    >
      <div
        style={{
          fontSize: 12.5,
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
          fontSize: 32,
          fontWeight: 600,
          fontVariantNumeric: "tabular-nums",
          color: eiraTokens.energyWhite,
          textShadow: "none",
        }}
      >
        {sv(value, decimals)}
        {suffix}
      </div>
    </motion.div>
  );
}

function GaugeModule({
  label,
  valuePct,
  color,
  reducedMotion,
  delay,
}: {
  label: string;
  valuePct: number;
  color: string;
  reducedMotion: boolean;
  delay: number;
}) {
  const displayed = useCountUp(valuePct, reducedMotion ? 0 : 900, reducedMotion);
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const arcFraction = Math.min(1, Math.abs(valuePct) / 300);

  return (
    <motion.div
      initial={{ opacity: 0, scale: reducedMotion ? 1 : 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: reducedMotion ? 0 : 0.4, delay: reducedMotion ? 0 : delay }}
      style={{ display: "flex", alignItems: "center", gap: 12 }}
    >
      <svg width={76} height={76} viewBox="0 0 76 76">
        <circle cx={38} cy={38} r={radius} fill="none" stroke={eiraTokens.panelBorder} strokeWidth={4} />
        <motion.circle
          cx={38}
          cy={38}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray={circumference}
          transform="rotate(-90 38 38)"
          style={{ filter: `drop-shadow(0 0 5px ${color})` }}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - arcFraction) }}
          transition={{ duration: reducedMotion ? 0 : 1, delay: reducedMotion ? 0 : delay, ease: "easeOut" }}
        />
      </svg>
      <div>
        <div style={{ fontSize: 22, fontWeight: 700, fontVariantNumeric: "tabular-nums", color }}>
          +{sv(displayed)}%
        </div>
        <div style={{ fontSize: 11.5, opacity: 0.6, maxWidth: 90 }}>{label}</div>
      </div>
    </motion.div>
  );
}

function MiniSparkline({ points, color }: { points: number[]; color: string }) {
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const width = 160;
  const height = 40;
  const step = width / (points.length - 1);
  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${i * step},${height - ((p - min) / range) * height}`)
    .join(" ");

  return (
    <svg width={width} height={height} style={{ overflow: "visible" }}>
      <defs>
        <filter id="ads-spark-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path d={path} fill="none" stroke={color} strokeWidth={2} filter="url(#ads-spark-glow)" opacity={0.9} />
    </svg>
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

interface GoogleAdsPanelProps {
  active: boolean;
}

export function GoogleAdsPanel({ active }: GoogleAdsPanelProps) {
  const reducedMotion = useReducedMotion();
  const isSmallScreen = useMediaQuery("(max-width: 768px)");
  const data = mockGoogleAdsData;

  const restOffsetX = reducedMotion ? 0 : 24;

  return (
    // Always mounted — toggled purely via the `animate` prop (like
    // HologramPanel), never via AnimatePresence/exit. Animation-completion
    // callbacks (onAnimationComplete, AnimatePresence's onExitComplete)
    // never fire in this project's Framer Motion setup — verified with a
    // trivial, always-mounted motion.div completely unrelated to this panel
    // — so anything waiting on an exit-completion signal hangs forever and
    // the panel never actually closes. This was a real, pre-existing bug in
    // the close button; fixed here with zero design/visual changes.
    //
    // Static positioning wrapper below — plain CSS transform, never
    // animated, so percentage centering doesn't fight with animated `scale`.
    <div
      style={{
        position: "absolute",
        top: "50%",
        right: isSmallScreen ? "auto" : "2%",
        left: isSmallScreen ? "50%" : "auto",
        width: isSmallScreen ? "92vw" : "clamp(720px, 48vw, 920px)",
        // 520 was sized for a desktop viewport — on a phone-height screen it
        // forces the panel to ~93% of the viewport regardless of maxHeight,
        // leaving almost no clearance above it (the mini orb bubble that
        // floats there when a panel is open on mobile ended up overlapping
        // this panel's own close button as a result).
        minHeight: isSmallScreen ? 320 : 520,
        maxHeight: "75vh",
        zIndex: 25,
        transform: isSmallScreen ? "translate(-50%, -50%)" : "translateY(-50%)",
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
          background: ADS_PANEL_BACKGROUND,
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
            GOOGLE ADS // COMMAND ANALYTICS
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, fontSize: 13, opacity: 0.85 }}>
            <motion.span
              animate={reducedMotion ? { opacity: 1 } : { opacity: [0.6, 1, 0.6] }}
              transition={reducedMotion ? undefined : { duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: eiraTokens.success,
                boxShadow: `0 0 8px ${eiraTokens.success}`,
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
        {data.meta.dataLabel}
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
          <KpiModule label="Klick" target={data.kpis.clicks} reducedMotion={reducedMotion} delay={0.05} />
          <KpiModule
            label="Exponeringar"
            target={data.kpis.impressions}
            reducedMotion={reducedMotion}
            delay={0.1}
          />
          <KpiModule
            label="Snitt CPC"
            target={data.kpis.avgCpc}
            decimals={2}
            suffix=" kr"
            reducedMotion={reducedMotion}
            delay={0.15}
          />
          <KpiModule
            label="Total kostnad"
            target={data.kpis.totalCost}
            suffix=" kr"
            reducedMotion={reducedMotion}
            delay={0.2}
          />
          <KpiModule
            label="CTR"
            target={data.kpis.ctr}
            decimals={2}
            suffix=" %"
            reducedMotion={reducedMotion}
            delay={0.25}
          />
        </div>

        <section style={sectionStyle}>
          <GoogleAdsChart points={data.chart.points} reducedMotion={reducedMotion} />
        </section>

        <section style={sectionStyle}>
          <div style={sectionTitleStyle}>{data.marketSignal.title}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap", marginBottom: 14 }}>
            <GaugeModule
              label="Sökvolym Sverige"
              valuePct={data.marketSignal.searchVolumeChangePct}
              color={eiraTokens.contrastAccent}
              reducedMotion={reducedMotion}
              delay={0.1}
            />
            <GaugeModule
              label="Mina klick"
              valuePct={data.marketSignal.myClicksChangePct}
              color={eiraTokens.accentBright}
              reducedMotion={reducedMotion}
              delay={0.2}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <MiniSparkline points={data.marketSignal.trend} color={eiraTokens.contrastAccent} />
              <div style={{ fontSize: 11, letterSpacing: 0.5, color: eiraTokens.success, opacity: 0.85 }}>
                ▲ UPPÅTGÅENDE TREND
              </div>
            </div>
          </div>
          <p style={{ fontSize: 15, opacity: 0.85, margin: "0 0 14px 0", lineHeight: 1.5 }}>
            {data.marketSignal.description}
          </p>
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
            <div style={{ fontSize: 15, fontStyle: "italic", opacity: 0.9 }}>
              &ldquo;{data.marketSignal.insight}&rdquo;
            </div>
          </div>
        </section>

        <section style={sectionStyle}>
          <div style={sectionTitleStyle}>SÖKORD // PRESTANDA</div>
          <GoogleAdsKeywordTable keywords={data.keywords} reducedMotion={reducedMotion} stacked={isSmallScreen} />
        </section>

        <section style={sectionStyle}>
          <div style={sectionTitleStyle}>JARVIS PERFORMANCE REPORT</div>
          <p style={{ fontSize: 15, lineHeight: 1.6, opacity: 0.85, margin: 0 }}>{data.performanceReport}</p>
        </section>
        </>
        )}
      </div>
      </motion.div>
    </div>
  );
}
