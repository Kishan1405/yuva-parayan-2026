import { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

const fieldBase =
  "w-full rounded-2xl border border-foreground/10 bg-background-elevated/80 px-4 py-3 text-[15px] text-foreground placeholder:text-foreground-muted/70 outline-none transition focus:border-saffron-deep/50 focus:ring-2 focus:ring-saffron-deep/20";

export function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1.5 block text-sm font-medium text-foreground-muted">{children}</label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${fieldBase} ${props.className ?? ""}`} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${fieldBase} resize-none ${props.className ?? ""}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${fieldBase} ${props.className ?? ""}`} />;
}
