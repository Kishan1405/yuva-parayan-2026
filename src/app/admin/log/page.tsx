"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock } from "lucide-react";
import { useSession } from "@/lib/session";
import { listAttendance } from "@/lib/admin";
import { EVENT_DAYS } from "@/lib/event";
import { GlassCard } from "@/components/ui/GlassCard";
import type { AttendanceLogEntry } from "@/lib/database.types";

const REFRESH_MS = 1000;

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export default function AttendanceLogPage() {
  const { deviceToken } = useSession();
  const [entries, setEntries] = useState<AttendanceLogEntry[] | null>(null);
  const [dayFilter, setDayFilter] = useState<number | "all">("all");
  const [error, setError] = useState<string | null>(null);
  const fetchingRef = useRef(false);

  useEffect(() => {
    if (!deviceToken) return;

    let cancelled = false;

    async function tick() {
      if (fetchingRef.current) return;
      fetchingRef.current = true;
      const { data, error } = await listAttendance(deviceToken!);
      fetchingRef.current = false;
      if (cancelled) return;
      if (error) setError(error);
      else {
        setError(null);
        setEntries(data);
      }
    }

    tick();
    const interval = setInterval(tick, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [deviceToken]);

  const counts = EVENT_DAYS.map((d) => ({
    day: d.day,
    count: entries?.filter((e) => e.day === d.day).length ?? 0,
  }));

  const visible =
    dayFilter === "all" ? entries : entries?.filter((e) => e.day === dayFilter) ?? null;

  return (
    <div className="space-y-6">
      <Link href="/admin" className="flex items-center gap-1.5 text-sm font-medium text-foreground-muted">
        <ArrowLeft size={16} />
        Admin
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Attendance Log</h1>
          <p className="mt-1 text-sm text-foreground-muted">Updates automatically every second.</p>
        </div>
        <span className="flex h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-saffron-deep" />
      </div>

      <div className="grid grid-cols-3 gap-3">
        {counts.map((c) => (
          <GlassCard key={c.day} className="text-center">
            <p className="font-display text-2xl font-semibold text-saffron-deep">{c.count}</p>
            <p className="mt-0.5 text-xs text-foreground-muted">Day {c.day}</p>
          </GlassCard>
        ))}
      </div>

      <div className="glass-card flex gap-1 rounded-2xl p-1">
        <button
          type="button"
          onClick={() => setDayFilter("all")}
          className={`flex-1 rounded-xl py-2 text-sm font-semibold transition ${
            dayFilter === "all"
              ? "bg-gradient-to-br from-saffron to-saffron-deep text-white shadow-md shadow-saffron-deep/20"
              : "text-foreground-muted"
          }`}
        >
          All
        </button>
        {EVENT_DAYS.map((d) => (
          <button
            key={d.day}
            type="button"
            onClick={() => setDayFilter(d.day)}
            className={`flex-1 rounded-xl py-2 text-sm font-semibold transition ${
              dayFilter === d.day
                ? "bg-gradient-to-br from-saffron to-saffron-deep text-white shadow-md shadow-saffron-deep/20"
                : "text-foreground-muted"
            }`}
          >
            Day {d.day}
          </button>
        ))}
      </div>

      {error && (
        <GlassCard className="text-center text-sm text-foreground-muted">{error}</GlassCard>
      )}

      {visible === null && !error && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="glass-card h-16 animate-pulse rounded-3xl" />
          ))}
        </div>
      )}

      {visible && visible.length === 0 && (
        <p className="py-8 text-center text-sm text-foreground-muted">No check-ins yet.</p>
      )}

      {visible && visible.length > 0 && (
        <div className="space-y-3">
          {visible.map((e) => (
            <GlassCard key={e.attendance_id} className="flex items-center gap-3 py-3">
              <CheckCircle2 className="shrink-0 text-saffron-deep" size={20} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{e.attendee_name}</p>
                <p className="truncate text-xs text-foreground-muted">
                  {e.contact_number}
                  {e.scanned_by_name && <> · scanned by {e.scanned_by_name}</>}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <span className="rounded-full bg-saffron-deep/12 px-2 py-0.5 text-[11px] font-semibold text-saffron-deep">
                  Day {e.day}
                </span>
                <p className="mt-1 flex items-center gap-1 text-[11px] text-foreground-muted">
                  <Clock size={11} />
                  {formatTime(e.scanned_at)}
                </p>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
