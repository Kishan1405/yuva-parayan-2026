"use client";

import { motion, type HTMLMotionProps } from "framer-motion";

interface GlassCardProps extends HTMLMotionProps<"div"> {
  strong?: boolean;
  /** Adds tap/hover feedback for cards that act as buttons/links. */
  interactive?: boolean;
}

export function GlassCard({ strong, interactive, className = "", ...props }: GlassCardProps) {
  const classes = `${strong ? "glass-card-strong" : "glass-card"} rounded-3xl p-5 ${className}`;

  return (
    <motion.div
      className={classes}
      {...(interactive
        ? {
            whileTap: { scale: 0.97 },
            whileHover: { scale: 1.01 },
            transition: { type: "spring", stiffness: 400, damping: 28 },
          }
        : {})}
      {...props}
    />
  );
}

/** Shared entrance-stagger variants for lists/grids of GlassCards. */
export const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

export const staggerItem = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 26 } },
};
