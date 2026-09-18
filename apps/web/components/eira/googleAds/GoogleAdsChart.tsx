"use client";

import { motion } from "motion/react";
import { eiraTokens } from "@/lib/eiraTokens";
import type { GoogleAdsChartPoint } from "@/lib/mockGoogleAdsData";

interface GoogleAdsChartProps {
  points: GoogleAdsChartPoint[];
  reducedMotion: boolean;
}

const WIDTH = 640;
const HEIGHT = 200;
const PAD_X = 8;
const PAD_TOP = 14;
const PAD_BOTTOM = 26;

function scale(values: number[], height: number): (value: number) => number {
  const max = Math.max(...values);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  return (value) => height - ((value - min) / range) * height;
}

function buildPath(values: number[], toY: (v: number) => number): string {
  const innerWidth = WIDTH - PAD_X * 2;
  const step = innerWidth / (values.length - 1);
  return values
    .map((v, i) => `${i === 0 ? "M" : "L"}${PAD_X + i * step},${PAD_TOP + toY(v)}`)
    .join(" ");
}

function buildAreaPath(values: number[], toY: (v: number) => number): string {
  const innerWidth = WIDTH - PAD_X * 2;
  const step = innerWidth / (values.length - 1);
  const line = values
    .map((v, i) => `${i === 0 ? "M" : "L"}${PAD_X + i * step},${PAD_TOP + toY(v)}`)
    .join(" ");
  const lastX = PAD_X + (values.length - 1) * step;
  const floorY = PAD_TOP + (HEIGHT - PAD_TOP - PAD_BOTTOM);
  return `${line} L${lastX},${floorY} L${PAD_X},${floorY} Z`;
}

export function GoogleAdsChart({ points, reducedMotion }: GoogleAdsChartProps) {
  const chartHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const clicks = points.map((p) => p.clicks);
  const impressions = points.map((p) => p.impressions);

  const clicksY = scale(clicks, chartHeight);
  const impressionsY = scale(impressions, chartHeight);

  const clicksLine = buildPath(clicks, clicksY);
  const clicksArea = buildAreaPath(clicks, clicksY);
  const impressionsLine = buildPath(impressions, impressionsY);
  const impressionsArea = buildAreaPath(impressions, impressionsY);

  const gridLines = [0, 0.25, 0.5, 0.75, 1];
  const labelEvery = Math.ceil(points.length / 5);

  return (
    <div style={{ width: "100%" }}>
      <div style={{ display: "flex", gap: 20, marginBottom: 8 }}>
        <LegendDot color={eiraTokens.cyanAccent} label="Klick" />
        <LegendDot color={eiraTokens.violetBright} label="Exponeringar" />
      </div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width="100%" style={{ overflow: "visible", display: "block" }}>
        <defs>
          <filter id="ads-line-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="ads-clicks-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={eiraTokens.cyanAccent} stopOpacity={0.28} />
            <stop offset="100%" stopColor={eiraTokens.cyanAccent} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="ads-impressions-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={eiraTokens.violetBright} stopOpacity={0.22} />
            <stop offset="100%" stopColor={eiraTokens.violetBright} stopOpacity={0} />
          </linearGradient>
        </defs>

        {gridLines.map((t) => (
          <line
            key={t}
            x1={PAD_X}
            x2={WIDTH - PAD_X}
            y1={PAD_TOP + t * chartHeight}
            y2={PAD_TOP + t * chartHeight}
            stroke={eiraTokens.panelBorder}
            strokeWidth={1}
          />
        ))}

        <motion.path
          d={impressionsArea}
          fill="url(#ads-impressions-area)"
          stroke="none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: reducedMotion ? 0 : 0.6, delay: reducedMotion ? 0 : 0.5 }}
        />
        <motion.path
          d={clicksArea}
          fill="url(#ads-clicks-area)"
          stroke="none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: reducedMotion ? 0 : 0.6, delay: reducedMotion ? 0 : 0.5 }}
        />

        <motion.path
          d={impressionsLine}
          fill="none"
          stroke={eiraTokens.violetBright}
          strokeWidth={2}
          strokeLinecap="round"
          filter="url(#ads-line-glow)"
          initial={{ pathLength: reducedMotion ? 1 : 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: reducedMotion ? 0 : 0.9, delay: reducedMotion ? 0 : 0.15, ease: "easeOut" }}
        />
        <motion.path
          d={clicksLine}
          fill="none"
          stroke={eiraTokens.cyanAccent}
          strokeWidth={2.2}
          strokeLinecap="round"
          filter="url(#ads-line-glow)"
          initial={{ pathLength: reducedMotion ? 1 : 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: reducedMotion ? 0 : 0.9, delay: reducedMotion ? 0 : 0.3, ease: "easeOut" }}
        />

        {points.map((p, i) =>
          i % labelEvery === 0 || i === points.length - 1 ? (
            <text
              key={p.date}
              x={PAD_X + (i * (WIDTH - PAD_X * 2)) / (points.length - 1)}
              y={HEIGHT - 6}
              fontSize={11}
              fill={eiraTokens.energyWhite}
              opacity={0.45}
              textAnchor="middle"
            >
              {p.date}
            </text>
          ) : null
        )}
      </svg>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: color,
          boxShadow: `0 0 6px ${color}`,
        }}
      />
      <span style={{ fontSize: 13, opacity: 0.7 }}>{label}</span>
    </div>
  );
}
