"use client";

import { useId } from "react";
import { motion } from "framer-motion";

interface Option<T extends string> {
  value: T;
  label: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
}) {
  const layoutId = useId();

  return (
    <div className="glass-card flex gap-1 rounded-2xl p-1">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className="relative flex-1 rounded-xl py-2.5 text-sm font-semibold"
          >
            {active && (
              <motion.span
                layoutId={`${layoutId}-pill`}
                className="absolute inset-0 rounded-xl bg-gradient-to-br from-saffron to-saffron-deep shadow-md shadow-saffron-deep/20"
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              />
            )}
            <span className={`relative z-10 ${active ? "text-white" : "text-foreground-muted"}`}>
              {opt.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
