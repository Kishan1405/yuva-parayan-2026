"use client";

import { useEffect, useRef, useState } from "react";
import QrScanner from "qr-scanner";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Clock, RotateCcw, ScanLine, XCircle } from "lucide-react";
import { useSession } from "@/lib/session";
import { markAttendance, listAttendance } from "@/lib/admin";
import { EVENT_DAYS, currentEventDay } from "@/lib/event";
import { GlassCard, staggerContainer, staggerItem } from "@/components/ui/GlassCard";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import type { AttendanceLogEntry } from "@/lib/database.types";

const QR_PREFIX = "YP2026:";
const RESUME_DELAY_MS = 1200;
const LOG_REFRESH_MS = 1000;

interface ScanResult {
  id: string;
  name: string;
  status: "ok" | "duplicate" | "error";
  message: string;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export default function ScanPage() {
  const { deviceToken } = useSession();

  // ---- scanner ----
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const busyRef = useRef(false);
  const [day, setDay] = useState(currentEventDay()?.day ?? EVENT_DAYS[0].day);
  const dayRef = useRef(day);
  const [results, setResults] = useState<ScanResult[]>([]);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // ---- attendee log ----
  const [entries, setEntries] = useState<AttendanceLogEntry[] | null>(null);
  const [dayFilter, setDayFilter] = useState<number | "all">("all");
  const [logError, setLogError] = useState<string | null>(null);
  const fetchingRef = useRef(false);

  useEffect(() => {
    dayRef.current = day;
  }, [day]);

  useEffect(() => {
    if (!videoRef.current || !deviceToken) return;

    const scanner = new QrScanner(
      videoRef.current,
      (result) => void handleDecode(result.data),
      { highlightScanRegion: true, highlightCodeOutline: true, maxScansPerSecond: 5 }
    );
    scannerRef.current = scanner;

    scanner.start().catch((err) => {
      setCameraError(err instanceof Error ? err.message : "Could not access the camera.");
    });

    async function handleDecode(rawValue: string) {
      if (busyRef.current || !rawValue.startsWith(QR_PREFIX) || !deviceToken) return;
      const targetUserId = rawValue.slice(QR_PREFIX.length);

      busyRef.current = true;
      scannerRef.current?.pause();

      const { data, error } = await markAttendance(deviceToken, targetUserId, dayRef.current);

      setResults((prev) => [
        data
          ? {
              id: `${data.attendance_id}-${Date.now()}`,
              name: data.target_name,
              status: data.already_marked ? "duplicate" : "ok",
              message: data.already_marked
                ? `Already checked in for Day ${data.day}`
                : `Checked in — Day ${data.day}`,
            }
          : {
              id: `err-${Date.now()}`,
              name: "Scan failed",
              status: "error",
              message: error ?? "Something went wrong.",
            },
        ...prev,
      ]);

      setTimeout(() => {
        busyRef.current = false;
        scannerRef.current?.start();
      }, RESUME_DELAY_MS);
    }

    return () => {
      scanner.stop();
      scanner.destroy();
      scannerRef.current = null;
    };
  }, [deviceToken]);

  useEffect(() => {
    if (!deviceToken) return;

    let cancelled = false;

    async function tick() {
      if (fetchingRef.current) return;
      fetchingRef.current = true;
      const { data, error } = await listAttendance(deviceToken!);
      fetchingRef.current = false;
      if (cancelled) return;
      if (error) setLogError(error);
      else {
        setLogError(null);
        setEntries(data);
      }
    }

    tick();
    const interval = setInterval(tick, LOG_REFRESH_MS);
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
      <div className="flex items-center gap-2">
        <ScanLine className="text-saffron-deep" size={22} />
        <h1 className="font-display text-2xl font-semibold">Scan</h1>
      </div>

      {/* ---------- scanner ---------- */}
      <div className="space-y-4">
        <p className="text-sm text-foreground-muted">Point the camera at an attendee&apos;s QR code.</p>

        <SegmentedControl
          options={EVENT_DAYS.map((d) => ({ value: String(d.day), label: `Day ${d.day}` }))}
          value={String(day)}
          onChange={(v) => setDay(Number(v) as 1 | 2 | 3)}
        />

        <GlassCard strong className="overflow-hidden p-0">
          <div className="relative aspect-square w-full bg-black">
            <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
          </div>
        </GlassCard>

        {cameraError && (
          <GlassCard className="flex items-center gap-3 text-sm text-foreground-muted">
            <XCircle className="shrink-0 text-red-500" size={18} />
            <span>{cameraError} Allow camera access and reload this page.</span>
          </GlassCard>
        )}

        <div>
          <h2 className="mb-3 font-display text-base font-semibold">Recent scans</h2>
          {results.length === 0 ? (
            <p className="py-6 text-center text-sm text-foreground-muted">No scans yet.</p>
          ) : (
            <div className="space-y-3">
              <AnimatePresence initial={false}>
                {results.map((r) => (
                  <motion.div
                    key={r.id}
                    layout
                    initial={{ opacity: 0, y: -16, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  >
                    <GlassCard className="flex items-center gap-3 py-3">
                      {r.status === "ok" && (
                        <CheckCircle2 className="shrink-0 text-saffron-deep" size={20} />
                      )}
                      {r.status === "duplicate" && (
                        <RotateCcw className="shrink-0 text-gold" size={20} />
                      )}
                      {r.status === "error" && (
                        <XCircle className="shrink-0 text-red-500" size={20} />
                      )}
                      <div>
                        <p className="text-sm font-semibold">{r.name}</p>
                        <p className="text-xs text-foreground-muted">{r.message}</p>
                      </div>
                    </GlassCard>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* ---------- attendee logs ---------- */}
      <div className="space-y-4 border-t border-foreground/10 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Attendee Logs</h2>
          <span className="flex h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-saffron-deep" />
        </div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="grid grid-cols-3 gap-3"
        >
          {counts.map((c) => (
            <GlassCard key={c.day} variants={staggerItem} className="text-center">
              <motion.p
                key={c.count}
                initial={{ scale: 1.3, opacity: 0.6 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                className="font-display text-2xl font-semibold text-saffron-deep"
              >
                {c.count}
              </motion.p>
              <p className="mt-0.5 text-xs text-foreground-muted">Day {c.day}</p>
            </GlassCard>
          ))}
        </motion.div>

        <SegmentedControl
          options={[
            { value: "all", label: "All" },
            ...EVENT_DAYS.map((d) => ({ value: String(d.day), label: `Day ${d.day}` })),
          ]}
          value={String(dayFilter)}
          onChange={(v) => setDayFilter(v === "all" ? "all" : Number(v))}
        />

        {logError && (
          <GlassCard className="text-center text-sm text-foreground-muted">{logError}</GlassCard>
        )}

        {visible === null && !logError && (
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
            <AnimatePresence initial={false}>
              {visible.map((e) => (
                <motion.div
                  key={e.attendance_id}
                  layout
                  initial={{ opacity: 0, y: -16, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                >
                  <GlassCard className="flex items-center gap-3 py-3">
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
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
