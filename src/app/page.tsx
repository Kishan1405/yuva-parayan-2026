"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Users, HeartHandshake, UserRound, MapPin, QrCode, ShieldCheck, CalendarClock } from "lucide-react";
import { useSession } from "@/lib/session";
import { EVENT_NAME } from "@/lib/event";
import { getActiveEvent } from "@/lib/api/events";
import { getMandalById } from "@/lib/api/mandals";
import { listDepartments } from "@/lib/api/departments";
import { GlassCard, staggerContainer, staggerItem } from "@/components/ui/GlassCard";
import { canManagePeople } from "@/lib/admin";
import type { Department, Event, Mandal } from "@/lib/api/types";

const QUICK_LINKS = [
  { href: "/attendance", label: "Attendance", icon: QrCode, blurb: "Your check-in QR code" },
  { href: "/departments", label: "Departments", icon: Users, blurb: "Sangeet, Prasad & more", adminOnly: true },
  { href: "/reflect", label: "Reflect", icon: HeartHandshake, blurb: "Feedback & memory wall" },
  { href: "/profile", label: "Profile", icon: UserRound, blurb: "Your details" },
];

function formatEventTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function HomePage() {
  const { user } = useSession();
  const canBrowseDepartments = canManagePeople(user?.role);
  const quickLinks = QUICK_LINKS.filter((l) => !l.adminOnly || canBrowseDepartments);
  const [mandal, setMandal] = useState<Mandal | null>(null);
  const [department, setDepartment] = useState<Department | null>(null);
  const [activeEvent, setActiveEvent] = useState<Event | null | undefined>(undefined);

  useEffect(() => {
    if (!user) return;
    if (user.mandal_id) {
      getMandalById(user.mandal_id).then(({ data }) => setMandal(data));
    }
    if (user.department_id) {
      const departmentId = user.department_id;
      listDepartments().then(({ data }) => {
        setDepartment(data?.find((d) => d.id === departmentId) ?? null);
      });
    }
  }, [user]);

  useEffect(() => {
    getActiveEvent().then(({ data }) => setActiveEvent(data));
  }, []);

  const firstName = user?.name.trim().split(" ")[0] ?? "";

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* On mobile this now lives in the top bar (AppShell); desktop keeps it here. */}
      <motion.div variants={staggerItem} className="hidden md:block">
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

      <Link href="/attendance">
        <GlassCard strong interactive variants={staggerItem} className="relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-xs font-semibold uppercase tracking-wide text-saffron-deep">
              {EVENT_NAME}
            </p>

            {activeEvent && (
              <>
                <p className="mt-1 font-display text-xl font-semibold">{activeEvent.title}</p>
                <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-saffron-deep">
                  <span className="flex h-2 w-2 shrink-0 animate-pulse rounded-full bg-saffron-deep" />
                  Live now · {formatEventTime(activeEvent.scheduled_at)}
                </p>
              </>
            )}

            {activeEvent === null && (
              <div className="mt-1 flex items-center gap-2 text-sm text-foreground-muted">
                <CalendarClock size={16} />
                No Sabha scheduled right now — check back Sunday.
              </div>
            )}

            {mandal && (
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-saffron-deep/10 px-3 py-1 text-xs font-medium text-saffron-deep">
                <MapPin size={13} />
                {mandal.name}
              </div>
            )}
          </div>
        </GlassCard>
      </Link>

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
    </motion.div>
  );
}
