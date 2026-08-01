"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/session";
import { GlassCard } from "@/components/ui/GlassCard";
import type { Department } from "@/lib/database.types";

export default function DepartmentsPage() {
  const { user } = useSession();
  const [departments, setDepartments] = useState<Department[] | null>(null);

  useEffect(() => {
    supabase
      .from("departments")
      .select("*")
      .order("sort_order")
      .then(({ data }) => setDepartments(data ?? []));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Departments</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Seva teams for Yuva Parayan 2026.
        </p>
      </div>

      <div className="space-y-4">
        {departments === null &&
          [0, 1, 2, 3].map((i) => (
            <div key={i} className="glass-card h-20 animate-pulse rounded-3xl" />
          ))}

        {departments?.map((dept) => (
          <Link key={dept.id} href={`/departments/${dept.slug}`}>
            <GlassCard className="flex items-center justify-between transition hover:brightness-105">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-saffron-deep/12">
                  <Users className="text-saffron-deep" size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-display text-sm font-semibold">{dept.name}</p>
                    {user?.department_id === dept.id && (
                      <span className="rounded-full bg-saffron-deep/15 px-2 py-0.5 text-[10px] font-semibold text-saffron-deep">
                        Yours
                      </span>
                    )}
                  </div>
                  {dept.description && (
                    <p className="mt-0.5 text-xs text-foreground-muted">{dept.description}</p>
                  )}
                </div>
              </div>
              <ChevronRight className="shrink-0 text-foreground-muted" size={18} />
            </GlassCard>
          </Link>
        ))}
      </div>
    </div>
  );
}
