"use client";

import { motion } from "framer-motion";
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
        <motion.button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          whileTap={{ scale: 1.3 }}
          animate={n <= value ? { scale: [1, 1.25, 1] } : { scale: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 15 }}
          className="p-0.5"
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
        >
          <Star
            size={28}
            className={n <= value ? "fill-saffron-deep text-saffron-deep" : "text-foreground/20"}
          />
        </motion.button>
      ))}
    </div>
  );
}
