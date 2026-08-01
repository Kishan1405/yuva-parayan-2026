"use client";

import { SessionProvider } from "@/lib/session";
import { AuthGate } from "@/components/AuthGate";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AuthGate>{children}</AuthGate>
    </SessionProvider>
  );
}
