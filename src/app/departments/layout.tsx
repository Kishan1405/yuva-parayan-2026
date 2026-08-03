"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session";
import { canManagePeople } from "@/lib/admin";

export default function DepartmentsLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useSession();
  const authorized = canManagePeople(user?.role);

  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!authorized) router.replace("/");
  }, [loading, authorized, router]);

  if (loading || !authorized) return null;

  return <>{children}</>;
}
