import { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost";
}

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-[15px] font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";
  const styles =
    variant === "primary"
      ? "bg-gradient-to-br from-saffron to-saffron-deep text-white shadow-lg shadow-saffron-deep/25 hover:brightness-105"
      : "glass-card text-foreground hover:bg-saffron-deep/10";

  return <button {...props} className={`${base} ${styles} ${className}`} />;
}
