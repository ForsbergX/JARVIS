"use client";

import { motion } from "motion/react";
import { eiraTokens } from "@/lib/eiraTokens";
import type { FinanceMonthPoint } from "@/lib/mockFinanceData";

interface FinanceChartProps {
  points: FinanceMonthPoint[];
  reducedMotion: boolean;
}

const WIDTH = 640;
const HEIGHT = 220;
const PAD_X = 16;
const PAD_TOP = 14;
const PAD_BOTTOM = 30;
const COST_COLOR = "#f472b6";

export function FinanceChart({ points, reducedMotion }: FinanceChartProps) {
  const chartHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const barMax = Math.max(...points.map((p) => Math.max(p.revenue, p.cost)));
  const resultValues = points.map((p) => p.result);
  const resultMax = Math.max(...resultValues, 0);
  const resultMin = Math.min(...resultValues, 0);
  const resultRange = resultMax - resultMin || 1;

  const groupWidth = (WIDTH - PAD_X * 2) / points.length;
  const barWidth = groupWidth * 0.28;

  const resultToY = (v: number) => chartHeight - ((v - resultMin) / resultRange) * chartHeight;
  const resultLine = points
    .map((p, i) => {
      const cx = PAD_X + groupWidth * (i + 0.5);
      return `${i === 0 ? "M" : "L"}${cx},${PAD_TOP + resultToY(p.result)}`;
    })
    .join(" ");

  const zeroLineY = PAD_TOP + resultToY(0);

  return (
    <div style={{ width: "100%" }}>
      <div style={{ display: "flex", gap: 20, marginBottom: 8, flexWrap: "wrap" }}>
        <LegendSwatch color={eiraTokens.cyanAccent} label="Intäkter" shape="square" />
        <LegendSwatch color={COST_COLOR} label="Kostnader" shape="square" />
        <LegendSwatch color={eiraTokens.success} label="Resultat" shape="line" />
      </div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width="100%" style={{ overflow: "visible", display: "block" }}>
        <defs>
          <filter id="finance-line-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="finance-revenue-bar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={eiraTokens.cyanAccent} stopOpacity={0.9} />
            <stop offset="100%" stopColor={eiraTokens.cyanAccent} stopOpacity={0.35} />
          </linearGradient>
          <linearGradient id="finance-cost-bar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COST_COLOR} stopOpacity={0.9} />
            <stop offset="100%" stopColor={COST_COLOR} stopOpacity={0.35} />
          </linearGradient>
        </defs>

        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
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

        {points.map((p, i) => {
          const groupX = PAD_X + groupWidth * i;
          const revenueHeight = (p.revenue / barMax) * chartHeight;
          const costHeight = (p.cost / barMax) * chartHeight;
          const baseY = PAD_TOP + chartHeight;
          return (
            <g key={p.month}>
              <motion.rect
                x={groupX + groupWidth * 0.5 - barWidth - 3}
                width={barWidth}
                fill="url(#finance-revenue-bar)"
                initial={{ height: 0, y: baseY }}
                animate={{ height: revenueHeight, y: baseY - revenueHeight }}
                transition={{ duration: reducedMotion ? 0 : 0.6, delay: reducedMotion ? 0 : 0.1 * i, ease: "easeOut" }}
                rx={2}
              />
              <motion.rect
                x={groupX + groupWidth * 0.5 + 3}
                width={barWidth}
                fill="url(#finance-cost-bar)"
                initial={{ height: 0, y: baseY }}
                animate={{ height: costHeight, y: baseY - costHeight }}
                transition={{ duration: reducedMotion ? 0 : 0.6, delay: reducedMotion ? 0 : 0.1 * i, ease: "easeOut" }}
                rx={2}
              />
            </g>
          );
        })}

        <line
          x1={PAD_X}
          x2={WIDTH - PAD_X}
          y1={zeroLineY}
          y2={zeroLineY}
          stroke={eiraTokens.energyWhite}
          strokeOpacity={0.2}
          strokeDasharray="4 4"
        />

        <motion.path
          d={resultLine}
          fill="none"
          stroke={eiraTokens.success}
          strokeWidth={2.4}
          strokeLinecap="round"
          filter="url(#finance-line-glow)"
          initial={{ pathLength: reducedMotion ? 1 : 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: reducedMotion ? 0 : 0.9, delay: reducedMotion ? 0 : 0.5, ease: "easeOut" }}
        />

        {points.map((p, i) => (
          <text
            key={p.month}
            x={PAD_X + groupWidth * (i + 0.5)}
            y={HEIGHT - 8}
            fontSize={11}
            fill={eiraTokens.energyWhite}
            opacity={0.5}
            textAnchor="middle"
          >
            {p.month}
          </text>
        ))}
      </svg>
    </div>
  );
}

function LegendSwatch({ color, label, shape }: { color: string; label: string; shape: "square" | "line" }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      {shape === "square" ? (
        <span style={{ width: 9, height: 9, borderRadius: 2, background: color }} />
      ) : (
        <span style={{ width: 14, height: 2, background: color, boxShadow: `0 0 4px ${color}` }} />
      )}
      <span style={{ fontSize: 13, opacity: 0.7 }}>{label}</span>
    </div>
  );
}
