"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Images, Users, HeartHandshake, UserRound, MapPin, QrCode, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/session";
import {
  EVENT_NAME,
  EVENT_DAYS,
  eventPhase,
  daysUntilStart,
  currentEventDay,
} from "@/lib/event";
import { GlassCard, staggerContainer, staggerItem } from "@/components/ui/GlassCard";
import { canManagePeople } from "@/lib/admin";
import type { Department, Mandal } from "@/lib/database.types";

const QUICK_LINKS = [
  { href: "/attendance", label: "Attendance", icon: QrCode, blurb: "Your check-in QR code" },
  { href: "/memories", label: "Past Memories", icon: Images, blurb: "Relive past gatherings" },
  { href: "/departments", label: "Departments", icon: Users, blurb: "Sangeet, Prasad & more", adminOnly: true },
  { href: "/reflect", label: "Reflect", icon: HeartHandshake, blurb: "Feedback & memory wall" },
  { href: "/profile", label: "Profile", icon: UserRound, blurb: "Your details" },
];

export default function HomePage() {
  const { user } = useSession();
  const canBrowseDepartments = canManagePeople(user?.role);
  const quickLinks = QUICK_LINKS.filter((l) => !l.adminOnly || canBrowseDepartments);
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
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <motion.div variants={staggerItem}>
        <p className="text-sm text-foreground-muted">Jai Swaminarayan{firstName ? "," : ""}</p>
        <div className="flex items-center gap-2">
          <h1 className="font-display text-2xl font-semibold">{firstName || "Welcome"}</h1>
          {user && (
            <span
              className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                user.role === "user"
                  ? "bg-foreground/5 text-foreground-muted"
                  : "bg-saffron-deep/15 text-saffron-deep"
              }`}
            >
              {user.role !== "user" && <ShieldCheck size={11} />}
              {user.role.replace("_", " ")}
            </span>
          )}
        </div>
      </motion.div>

      <GlassCard strong variants={staggerItem} className="relative overflow-hidden">
        <div className="relative z-10">
          <p className="text-xs font-semibold uppercase tracking-wide text-saffron-deep">
            {EVENT_NAME}
          </p>
          <p className="mt-1 font-display text-xl font-semibold">6–8 August 2026</p>

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

      {department &&
        (canBrowseDepartments ? (
          <Link href={`/departments/${department.slug}`}>
            <GlassCard interactive variants={staggerItem} className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-foreground-muted">
                  Your seva
                </p>
                <p className="font-display text-base font-semibold">{department.name}</p>
              </div>
              <Users className="text-saffron-deep" size={22} />
            </GlassCard>
          </Link>
        ) : (
          <GlassCard variants={staggerItem} className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-foreground-muted">
                Your seva
              </p>
              <p className="font-display text-base font-semibold">{department.name}</p>
            </div>
            <Users className="text-saffron-deep" size={22} />
          </GlassCard>
        ))}

      <motion.div variants={staggerItem}>
        <h2 className="mb-3 font-display text-base font-semibold">Explore</h2>
        <div className="grid grid-cols-2 gap-3">
          {quickLinks.map(({ href, label, icon: Icon, blurb }, i) =>
            i === 0 ? (
              <Link key={href} href={href} className="col-span-2">
                <GlassCard interactive className="flex items-center gap-3">
                  <Icon className="text-saffron-deep" size={22} />
                  <div>
                    <p className="font-display text-sm font-semibold">{label}</p>
                    <p className="mt-0.5 text-xs text-foreground-muted">{blurb}</p>
                  </div>
                </GlassCard>
              </Link>
            ) : (
              <Link key={href} href={href}>
                <GlassCard interactive className="h-full">
                  <Icon className="text-saffron-deep" size={22} />
                  <p className="mt-3 font-display text-sm font-semibold">{label}</p>
                  <p className="mt-0.5 text-xs text-foreground-muted">{blurb}</p>
                </GlassCard>
              </Link>
            )
          )}
        </div>
      </motion.div>

      <motion.div variants={staggerItem}>
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
      </motion.div>
    </motion.div>
  );
}
