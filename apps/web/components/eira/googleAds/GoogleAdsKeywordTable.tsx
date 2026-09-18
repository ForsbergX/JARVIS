"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { eiraTokens } from "@/lib/eiraTokens";
import type { GoogleAdsKeyword } from "@/lib/mockGoogleAdsData";

interface GoogleAdsKeywordTableProps {
  keywords: GoogleAdsKeyword[];
  reducedMotion: boolean;
  stacked: boolean;
}

const badgeColor: Record<NonNullable<GoogleAdsKeyword["badge"]>, string> = {
  "BÄSTA CTR": eiraTokens.cyanAccent,
  "STÖRSTA TRAFIKKÄLLA": eiraTokens.violetBright,
};

const gridColumns = "1fr 190px 60px 70px";

export function GoogleAdsKeywordTable({ keywords, reducedMotion, stacked }: GoogleAdsKeywordTableProps) {
  const maxCost = Math.max(...keywords.map((k) => k.cost));
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {!stacked && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: gridColumns,
            gap: 12,
            padding: "0 10px",
            fontSize: 12,
            letterSpacing: 1,
            opacity: 0.5,
            marginBottom: 4,
          }}
        >
          <span>SÖKORD</span>
          <span>KOSTNAD</span>
          <span>KLICK</span>
          <span>CTR</span>
        </div>
      )}

      {keywords.map((k, i) => (
        <motion.div
          key={k.keyword}
          onMouseEnter={() => setHovered(i)}
          onMouseLeave={() => setHovered((h) => (h === i ? null : h))}
          initial={{ opacity: 0, x: reducedMotion ? 0 : 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.35, delay: reducedMotion ? 0 : 0.05 * i }}
          style={{
            display: "grid",
            gridTemplateColumns: stacked ? "1fr" : gridColumns,
            alignItems: "center",
            gap: stacked ? 8 : 12,
            padding: 10,
            borderRadius: 8,
            border: `1px solid ${hovered === i ? eiraTokens.panelBorder : "transparent"}`,
            background: hovered === i ? "rgba(192, 132, 252, 0.08)" : "transparent",
            transition: "background 0.2s ease, border-color 0.2s ease",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          <div style={{ fontSize: 15, display: "flex", flexDirection: "column", gap: 4, wordBreak: "break-word" }}>
            {k.keyword}
            {k.badge && (
              <span
                style={{
                  fontSize: 10.5,
                  letterSpacing: 0.6,
                  border: `1px solid ${badgeColor[k.badge]}`,
                  color: badgeColor[k.badge],
                  borderRadius: 999,
                  padding: "2px 8px",
                  width: "fit-content",
                  opacity: 0.9,
                }}
              >
                {k.badge}
              </span>
            )}
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: stacked ? "row" : "column",
              justifyContent: stacked ? "space-between" : undefined,
              alignItems: stacked ? "center" : undefined,
              gap: 4,
              fontSize: 14,
            }}
          >
            {!stacked && (
              <div
                style={{
                  height: 5,
                  borderRadius: 3,
                  background: "rgba(255,255,255,0.08)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${Math.max(6, (k.cost / maxCost) * 100)}%`,
                    borderRadius: 3,
                    background: `linear-gradient(90deg, ${eiraTokens.violetPrimary}, ${eiraTokens.cyanAccent})`,
                    boxShadow: `0 0 6px ${eiraTokens.violetBright}88`,
                  }}
                />
              </div>
            )}
            <span>
              {k.cost.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kr
            </span>
          </div>
          <div style={{ fontSize: 15, display: "flex", justifyContent: stacked ? "space-between" : undefined }}>
            {stacked && <span style={{ opacity: 0.5, fontSize: 12 }}>KLICK</span>}
            {k.clicks}
          </div>
          <div style={{ fontSize: 15, display: "flex", justifyContent: stacked ? "space-between" : undefined }}>
            {stacked && <span style={{ opacity: 0.5, fontSize: 12 }}>CTR</span>}
            {k.ctr.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %
          </div>
        </motion.div>
      ))}
    </div>
  );
}
