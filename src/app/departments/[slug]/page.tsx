"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Phone, Star } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { GlassCard } from "@/components/ui/GlassCard";
import type { Department, DepartmentRosterEntry, DepartmentTask } from "@/lib/database.types";

export default function DepartmentDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [department, setDepartment] = useState<Department | null | undefined>(undefined);
  const [members, setMembers] = useState<DepartmentRosterEntry[]>([]);
  const [tasks, setTasks] = useState<DepartmentTask[]>([]);

  useEffect(() => {
    supabase
      .from("departments")
      .select("*")
      .eq("slug", slug)
      .maybeSingle()
      .then(async ({ data }) => {
        setDepartment(data ?? null);
        if (!data) return;

        const [rosterRes, tasksRes] = await Promise.all([
          supabase.rpc("get_department_roster", { p_department_id: data.id }),
          supabase.from("department_tasks").select("*").eq("department_id", data.id).order("sort_order"),
        ]);
        setMembers(rosterRes.data ?? []);
        setTasks(tasksRes.data ?? []);
      });
  }, [slug]);

  if (department === undefined) {
    return (
      <div className="space-y-4">
        <div className="glass-card h-8 w-40 animate-pulse rounded-full" />
        <div className="glass-card h-32 animate-pulse rounded-3xl" />
      </div>
    );
  }

  if (department === null) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-foreground-muted">Department not found.</p>
        <button onClick={() => router.push("/departments")} className="text-saffron-deep">
          Back to departments
        </button>
      </div>
    );
  }

  const inCharge = members.filter((m) => m.department_role === "in-charge");
  const regular = members.filter((m) => m.department_role !== "in-charge");

  return (
    <div className="space-y-6">
      <button
        onClick={() => router.push("/departments")}
        className="flex items-center gap-1.5 text-sm font-medium text-foreground-muted"
      >
        <ArrowLeft size={16} />
        Departments
      </button>

      <div>
        <h1 className="font-display text-2xl font-semibold">{department.name}</h1>
        {department.description && (
          <p className="mt-1 text-sm text-foreground-muted">{department.description}</p>
        )}
      </div>

      {inCharge.length > 0 && (
        <div>
          <h2 className="mb-3 font-display text-base font-semibold">In-charge</h2>
          <div className="space-y-4">
            {inCharge.map((m) => (
              <MemberRow key={m.contact_number} member={m} />
            ))}
          </div>
        </div>
      )}

      {regular.length > 0 && (
        <div>
          <h2 className="mb-3 font-display text-base font-semibold">Members</h2>
          <div className="space-y-4">
            {regular.map((m) => (
              <MemberRow key={m.contact_number} member={m} />
            ))}
          </div>
        </div>
      )}

      {members.length === 0 && (
        <GlassCard className="text-center text-sm text-foreground-muted">
          No members assigned yet.
        </GlassCard>
      )}

      <div>
        <h2 className="mb-3 font-display text-base font-semibold">Tasks</h2>
        {tasks.length === 0 ? (
          <GlassCard className="text-center text-sm text-foreground-muted">
            No tasks listed yet.
          </GlassCard>
        ) : (
          <GlassCard className="space-y-3">
            {tasks.map((t) => (
              <div key={t.id} className="flex items-center gap-3">
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 ${
                    t.is_done
                      ? "border-saffron-deep bg-saffron-deep"
                      : "border-foreground/20"
                  }`}
                >
                  {t.is_done && <span className="h-2 w-2 rounded-sm bg-white" />}
                </span>
                <span
                  className={`text-sm ${
                    t.is_done ? "text-foreground-muted line-through" : "text-foreground"
                  }`}
                >
                  {t.title}
                </span>
              </div>
            ))}
          </GlassCard>
        )}
      </div>
    </div>
  );
}

function MemberRow({ member }: { member: DepartmentRosterEntry }) {
  return (
    <GlassCard className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-saffron-deep/12 text-sm font-semibold text-saffron-deep">
          {member.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-medium">{member.name}</p>
          {member.department_role === "in-charge" && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-saffron-deep">
              <Star size={11} /> In-charge
            </span>
          )}
        </div>
      </div>
      {member.contact_number && (
        <a
          href={`tel:${member.contact_number}`}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-saffron-deep/10 text-saffron-deep"
        >
          <Phone size={16} />
        </a>
      )}
    </GlassCard>
  );
}
