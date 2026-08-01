"use client";

import { Star } from "lucide-react";

export function StarRating({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex gap-1.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className="p-0.5"
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
        >
          <Star
            size={28}
            className={n <= value ? "fill-saffron-deep text-saffron-deep" : "text-foreground/20"}
          />
        </button>
      ))}
    </div>
  );
}
