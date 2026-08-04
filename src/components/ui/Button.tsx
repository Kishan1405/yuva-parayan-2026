"use client";

import { ButtonHTMLAttributes } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost";
}

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-[15px] font-semibold disabled:cursor-not-allowed disabled:opacity-50";
  const styles =
    variant === "primary"
      ? "bg-gradient-to-br from-saffron to-saffron-deep text-white shadow-lg shadow-saffron-deep/25 hover:brightness-105"
      : "glass-card text-foreground hover:bg-saffron-deep/10";

  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      whileHover={props.disabled ? undefined : { scale: 1.015 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className={`${base} ${styles} ${className}`}
      {...(props as HTMLMotionProps<"button">)}
    />
  );
}
