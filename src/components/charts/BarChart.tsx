"use client";

import { useState } from "react";

export type BarDatum = { key: string; label: string; value: number };

// Plain HTML/CSS bars (no SVG needed) — thin marks, 4px rounded data-end,
// grows from a single baseline, value labeled directly at the tip/cap so
// nothing is gated behind hover. Hover just lifts the bar and its label.
export function BarChart({
  data,
  orientation = "vertical",
  color = "var(--saffron-deep)",
  formatValue = (n: number) => n.toLocaleString(),
  height = 180,
}: {
  data: BarDatum[];
  orientation?: "vertical" | "horizontal";
  color?: string;
  formatValue?: (n: number) => string;
  height?: number;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));

  if (data.length === 0) {
    return <p className="py-6 text-center text-sm text-foreground-muted">No data yet.</p>;
  }

  if (orientation === "horizontal") {
    return (
      <div className="space-y-3.5">
        {data.map((d) => {
          const pct = (d.value / max) * 100;
          const isHovered = hovered === d.key;
          return (
            <div
              key={d.key}
              tabIndex={0}
              role="img"
              aria-label={`${d.label}: ${formatValue(d.value)}`}
              className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-saffron-deep/40"
              onMouseEnter={() => setHovered(d.key)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(d.key)}
              onBlur={() => setHovered(null)}
            >
              <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                <span
                  className={`truncate font-medium transition-colors ${
                    isHovered ? "text-foreground" : "text-foreground-muted"
                  }`}
                >
                  {d.label}
                </span>
                <span className="shrink-0 font-semibold tabular-nums">{formatValue(d.value)}</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-foreground/5">
                <div
                  className="h-full rounded-full transition-[width,filter] duration-300 ease-out"
                  style={{
                    width: `${Math.max(2, pct)}%`,
                    backgroundColor: color,
                    filter: isHovered ? "brightness(1.15)" : undefined,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  const plotHeight = height - 40;

  return (
    <div className="flex items-end justify-center gap-4 sm:gap-8" style={{ height }}>
      {data.map((d) => {
        const pct = d.value / max;
        const isHovered = hovered === d.key;
        return (
          <div
            key={d.key}
            tabIndex={0}
            role="img"
            aria-label={`${d.label}: ${formatValue(d.value)}`}
            className="flex flex-1 max-w-16 flex-col items-center justify-end gap-2 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-saffron-deep/40"
            onMouseEnter={() => setHovered(d.key)}
            onMouseLeave={() => setHovered(null)}
            onFocus={() => setHovered(d.key)}
            onBlur={() => setHovered(null)}
          >
            <span
              className={`text-xs font-semibold tabular-nums transition-opacity ${
                isHovered ? "opacity-100" : "opacity-80"
              }`}
            >
              {formatValue(d.value)}
            </span>
            <div
              className="w-6 rounded-t-[4px] transition-[height,filter] duration-300 ease-out"
              style={{
                height: Math.max(4, pct * plotHeight),
                backgroundColor: color,
                filter: isHovered ? "brightness(1.15)" : undefined,
              }}
            />
            <span className="text-xs font-medium text-foreground-muted">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}
