import { HTMLAttributes } from "react";

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  strong?: boolean;
}

export function GlassCard({ strong, className = "", ...props }: GlassCardProps) {
  return (
    <div
      className={`${
        strong ? "glass-card-strong" : "glass-card"
      } rounded-3xl p-5 ${className}`}
      {...props}
    />
  );
}
