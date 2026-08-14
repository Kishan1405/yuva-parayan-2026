"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { CalendarClock, CheckCircle2, Circle } from "lucide-react";
import { useSession } from "@/lib/session";
import { getMyAttendance } from "@/lib/api/attendance";
import { getActiveEvent } from "@/lib/api/events";
import { GlassCard } from "@/components/ui/GlassCard";
import type { Attendance, Event } from "@/lib/api/types";

// Scoped to the live event, not just the user — a screenshot of last
// week's QR won't carry an id the server still recognizes as active.
export function qrValueForUser(userId: string, eventId: string) {
  return `YUVASABHA:${userId}:${eventId}`;
}

function formatEventTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function AttendancePage() {
  const { user, deviceToken } = useSession();
  // undefined = still checking, null = confirmed no live Sabha
  const [activeEvent, setActiveEvent] = useState<Event | null | undefined>(undefined);
  const [attendance, setAttendance] = useState<Attendance[] | null>(null);

  useEffect(() => {
    getActiveEvent().then(({ data }) => setActiveEvent(data));
  }, []);

  useEffect(() => {
    if (!deviceToken) return;
    getMyAttendance(deviceToken).then(({ data }) => setAttendance(data));
  }, [deviceToken]);

  if (!user) return null;

  const checkedInForActiveEvent =
    !!activeEvent && (attendance ?? []).some((a) => a.event_id === activeEvent.id);

  const history = [...(attendance ?? [])].sort((a, b) => (a.scanned_at < b.scanned_at ? 1 : -1));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Attendance</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Show this code when a Yuva Sabha is live.
        </p>
      </div>

      {activeEvent === undefined && (
        <GlassCard strong className="py-10 text-center text-sm text-foreground-muted">
          Checking for a live Sabha…
        </GlassCard>
      )}

      {activeEvent === null && (
        <GlassCard strong className="flex flex-col items-center gap-2 py-10 text-center">
          <CalendarClock className="text-foreground-muted" size={28} />
          <p className="font-display text-base font-semibold">No Yuva Sabha is live right now</p>
          <p className="max-w-xs text-sm text-foreground-muted">
            Your check-in code will appear here once an admin starts one.
          </p>
        </GlassCard>
      )}

      {activeEvent && (
        <GlassCard strong className="flex flex-col items-center gap-4 py-8">
          <div className="rounded-2xl bg-white p-4">
            <QRCodeSVG value={qrValueForUser(user.id, activeEvent.id)} size={200} level="M" />
          </div>
          <div className="text-center">
            <p className="font-display text-base font-semibold">{user.name}</p>
            <p className="text-xs text-foreground-muted">{user.contact_number}</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-saffron-deep">{activeEvent.title}</p>
            <p className="text-xs text-foreground-muted">
              {formatEventTime(activeEvent.scheduled_at)}
            </p>
          </div>
          {checkedInForActiveEvent ? (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-saffron-deep">
              <CheckCircle2 size={17} />
              Checked in
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-foreground-muted">
              <Circle size={17} />
              Not checked in yet
            </span>
          )}
        </GlassCard>
      )}

      {history.length > 0 && (
        <div>
          <h2 className="mb-3 font-display text-base font-semibold">Your check-in history</h2>
          <div className="space-y-3">
            {history.slice(0, 8).map((a) => (
              <GlassCard key={a.id} className="flex items-center justify-between py-3.5">
                <span className="text-sm font-medium">{formatEventTime(a.scanned_at)}</span>
                <span className="flex items-center gap-1.5 text-xs font-semibold text-saffron-deep">
                  <CheckCircle2 size={17} />
                  Checked in
                </span>
              </GlassCard>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
