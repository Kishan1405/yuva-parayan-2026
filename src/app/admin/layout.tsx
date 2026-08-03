"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session";
import { canScan } from "@/lib/admin";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useSession();
  const router = useRouter();
  const authorized = canScan(user?.role);

  useEffect(() => {
    if (loading) return;
    if (!authorized) router.replace("/");
  }, [loading, authorized, router]);

  if (loading || !authorized) return null;

  return <>{children}</>;
}
