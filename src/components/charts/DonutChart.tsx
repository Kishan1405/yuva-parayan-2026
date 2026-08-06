"use client";

import { useState } from "react";

export type DonutDatum = { key: string; label: string; value: number; color: string };

// Ring built from one <circle> per slice (stroke-dasharray), a couple of
// degrees of surface-color gap between slices instead of a stroke, and a
// legend that doubles as the "table view" — value + share are always
// visible, never gated behind hover.
export function DonutChart({
  data,
  size = 176,
  thickness = 26,
  formatValue = (n: number) => n.toLocaleString(),
}: {
  data: DonutDatum[];
  size?: number;
  thickness?: number;
  formatValue?: (n: number) => string;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const total = data.reduce((sum, d) => sum + d.value, 0);

  if (total <= 0) {
    return <p className="py-6 text-center text-sm text-foreground-muted">No data yet.</p>;
  }

  const r = (size - thickness) / 2;
  const circumference = 2 * Math.PI * r;
  const gapFrac = data.length > 1 ? 2 / 360 : 0;

  // Pure fold — never reassigns a variable across renders — that produces
  // each slice's dash length + rotation offset from the running total.
  const segments = data.reduce<{
    cumulative: number;
    items: { key: string; color: string; dash: number; gap: number; offset: number }[];
  }>(
    (acc, d) => {
      const frac = d.value / total;
      const segFrac = Math.max(0, frac - gapFrac);
      const dash = segFrac * circumference;
      const gap = circumference - dash;
      const offset = -acc.cumulative * circumference;
      return {
        cumulative: acc.cumulative + frac,
        items: [...acc.items, { key: d.key, color: d.color, dash, gap, offset }],
      };
    },
    { cumulative: 0, items: [] }
  ).items;

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90 shrink-0"
        role="img"
        aria-label={`${data.map((d) => `${d.label} ${formatValue(d.value)}`).join(", ")}`}
      >
        {segments.map((seg) => {
          const isHovered = hovered === seg.key;
          return (
            <circle
              key={seg.key}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth={isHovered ? thickness + 4 : thickness}
              strokeDasharray={`${seg.dash} ${seg.gap}`}
              strokeDashoffset={seg.offset}
              strokeLinecap="butt"
              tabIndex={0}
              style={{ transition: "stroke-width 0.2s ease-out", outline: "none" }}
              onMouseEnter={() => setHovered(seg.key)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(seg.key)}
              onBlur={() => setHovered(null)}
            />
          );
        })}
      </svg>

      <div className="w-full space-y-1.5">
        {data.map((d) => {
          const pct = Math.round((d.value / total) * 100);
          const isHovered = hovered === d.key;
          return (
            <div
              key={d.key}
              tabIndex={0}
              className={`flex items-center justify-between gap-3 rounded-xl px-2.5 py-1.5 text-sm outline-none transition-colors ${
                isHovered ? "bg-foreground/5" : ""
              }`}
              onMouseEnter={() => setHovered(d.key)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(d.key)}
              onBlur={() => setHovered(null)}
            >
              <span className="flex min-w-0 items-center gap-2 font-medium">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: d.color }}
                />
                <span className="truncate">{d.label}</span>
              </span>
              <span className="shrink-0 tabular-nums text-foreground-muted">
                {formatValue(d.value)} <span className="text-xs">({pct}%)</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
