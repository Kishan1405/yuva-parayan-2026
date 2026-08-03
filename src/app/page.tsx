"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Images, Users, HeartHandshake, UserRound, MapPin, QrCode } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/session";
import {
  EVENT_NAME,
  EVENT_DAYS,
  eventPhase,
  daysUntilStart,
  currentEventDay,
} from "@/lib/event";
import { GlassCard } from "@/components/ui/GlassCard";
import type { Department, Mandal } from "@/lib/database.types";

const QUICK_LINKS = [
  { href: "/attendance", label: "Attendance", icon: QrCode, blurb: "Your check-in QR code" },
  { href: "/memories", label: "Past Memories", icon: Images, blurb: "Relive past gatherings" },
  { href: "/departments", label: "Departments", icon: Users, blurb: "Sangeet, Prasad & more" },
  { href: "/reflect", label: "Reflect", icon: HeartHandshake, blurb: "Feedback & memory wall" },
  { href: "/profile", label: "Profile", icon: UserRound, blurb: "Your details" },
];

export default function HomePage() {
  const { user } = useSession();
  const [mandal, setMandal] = useState<Mandal | null>(null);
  const [department, setDepartment] = useState<Department | null>(null);

  useEffect(() => {
    if (!user) return;
    if (user.mandal_id) {
      supabase
        .from("mandals")
        .select("*")
        .eq("id", user.mandal_id)
        .maybeSingle()
        .then(({ data }) => setMandal(data));
    }
    if (user.department_id) {
      supabase
        .from("departments")
        .select("*")
        .eq("id", user.department_id)
        .maybeSingle()
        .then(({ data }) => setDepartment(data));
    }
  }, [user]);

  const phase = eventPhase();
  const today = currentEventDay();
  const firstName = user?.name.trim().split(" ")[0] ?? "";

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-foreground-muted">Jai Swaminarayan{firstName ? "," : ""}</p>
        <h1 className="font-display text-2xl font-semibold">{firstName || "Welcome"}</h1>
      </div>

      <GlassCard strong className="relative overflow-hidden">
        <div className="relative z-10">
          <p className="text-xs font-semibold uppercase tracking-wide text-saffron-deep">
            {EVENT_NAME}
          </p>
          <p className="mt-1 font-display text-xl font-semibold">7–9 August 2026</p>

          {phase === "upcoming" && (
            <p className="mt-2 text-sm text-foreground-muted">
              {daysUntilStart()} day{daysUntilStart() === 1 ? "" : "s"} to go
            </p>
          )}
          {phase === "live" && today && (
            <p className="mt-2 text-sm font-medium text-saffron-deep">{today.label} · Today</p>
          )}
          {phase === "ended" && (
            <p className="mt-2 text-sm text-foreground-muted">
              Thank you for being part of {EVENT_NAME} 🙏
            </p>
          )}

          {mandal && (
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-saffron-deep/10 px-3 py-1 text-xs font-medium text-saffron-deep">
              <MapPin size={13} />
              {mandal.name}
            </div>
          )}
        </div>
      </GlassCard>

      {department && (
        <Link href={`/departments/${department.slug}`}>
          <GlassCard className="flex items-center justify-between transition hover:brightness-105">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-foreground-muted">
                Your seva
              </p>
              <p className="font-display text-base font-semibold">{department.name}</p>
            </div>
            <Users className="text-saffron-deep" size={22} />
          </GlassCard>
        </Link>
      )}

      <div>
        <h2 className="mb-3 font-display text-base font-semibold">Explore</h2>
        <div className="grid grid-cols-2 gap-3">
          {QUICK_LINKS.map(({ href, label, icon: Icon, blurb }, i) =>
            i === 0 ? (
              <Link key={href} href={href} className="col-span-2">
                <GlassCard className="flex items-center gap-3 transition hover:brightness-105">
                  <Icon className="text-saffron-deep" size={22} />
                  <div>
                    <p className="font-display text-sm font-semibold">{label}</p>
                    <p className="mt-0.5 text-xs text-foreground-muted">{blurb}</p>
                  </div>
                </GlassCard>
              </Link>
            ) : (
              <Link key={href} href={href}>
                <GlassCard className="h-full transition hover:brightness-105">
                  <Icon className="text-saffron-deep" size={22} />
                  <p className="mt-3 font-display text-sm font-semibold">{label}</p>
                  <p className="mt-0.5 text-xs text-foreground-muted">{blurb}</p>
                </GlassCard>
              </Link>
            )
          )}
        </div>
      </div>

      <div>
        <h2 className="mb-3 font-display text-base font-semibold">Schedule</h2>
        <div className="space-y-4">
          {EVENT_DAYS.map((d) => (
            <GlassCard
              key={d.day}
              className={`flex items-center justify-between py-3 ${
                today?.day === d.day ? "ring-2 ring-saffron-deep/40" : ""
              }`}
            >
              <span className="text-sm font-medium">{d.label}</span>
              {today?.day === d.day && (
                <span className="rounded-full bg-saffron-deep/15 px-2.5 py-1 text-[11px] font-semibold text-saffron-deep">
                  Today
                </span>
              )}
            </GlassCard>
          ))}
        </div>
      </div>
    </div>
  );
}
