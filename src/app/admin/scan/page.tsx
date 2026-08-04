"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import QrScanner from "qr-scanner";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, CheckCircle2, RotateCcw, XCircle } from "lucide-react";
import { useSession } from "@/lib/session";
import { markAttendance } from "@/lib/admin";
import { EVENT_DAYS, currentEventDay } from "@/lib/event";
import { GlassCard } from "@/components/ui/GlassCard";
import { SegmentedControl } from "@/components/ui/SegmentedControl";

const QR_PREFIX = "YP2026:";
const RESUME_DELAY_MS = 1200;

interface ScanResult {
  id: string;
  name: string;
  status: "ok" | "duplicate" | "error";
  message: string;
}

export default function ScanAttendancePage() {
  const { deviceToken } = useSession();
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const busyRef = useRef(false);

  const [day, setDay] = useState(currentEventDay()?.day ?? EVENT_DAYS[0].day);
  const dayRef = useRef(day);
  const [results, setResults] = useState<ScanResult[]>([]);
  const [cameraError, setCameraError] = useState<string | null>(null);

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

  return (
    <div className="space-y-6">
      <Link href="/admin" className="flex items-center gap-1.5 text-sm font-medium text-foreground-muted">
        <ArrowLeft size={16} />
        Admin
      </Link>

      <div>
        <h1 className="font-display text-2xl font-semibold">Scan Attendance</h1>
        <p className="mt-1 text-sm text-foreground-muted">Point the camera at an attendee&apos;s QR code.</p>
      </div>

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
                    {r.status === "error" && <XCircle className="shrink-0 text-red-500" size={20} />}
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
  );
}
