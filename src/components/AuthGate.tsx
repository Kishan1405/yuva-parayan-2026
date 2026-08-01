"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/lib/session";
import { AppShell } from "@/components/AppShell";

const PUBLIC_PATHS = ["/onboarding"];

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const isPublic = PUBLIC_PATHS.includes(pathname);

  useEffect(() => {
    if (loading) return;
    if (!user && !isPublic) {
      router.replace("/onboarding");
    }
    if (user && pathname === "/onboarding") {
      router.replace("/");
    }
  }, [loading, user, isPublic, pathname, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-saffron-deep border-t-transparent" />
      </div>
    );
  }

  if (!user && !isPublic) {
    return null;
  }

  if (!user && isPublic) {
    return <>{children}</>;
  }

  return <AppShell>{children}</AppShell>;
}
