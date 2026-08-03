"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { CheckCircle2, Circle } from "lucide-react";
import { useSession } from "@/lib/session";
import { getMyAttendance } from "@/lib/admin";
import { EVENT_DAYS } from "@/lib/event";
import { GlassCard } from "@/components/ui/GlassCard";
import type { Attendance } from "@/lib/database.types";

export function qrValueForUser(userId: string) {
  return `YP2026:${userId}`;
}

export default function AttendancePage() {
  const { user, deviceToken } = useSession();
  const [attendance, setAttendance] = useState<Attendance[] | null>(null);

  useEffect(() => {
    if (!deviceToken) return;
    getMyAttendance(deviceToken).then(({ data }) => setAttendance(data));
  }, [deviceToken]);

  if (!user) return null;

  const markedDays = new Set((attendance ?? []).map((a) => a.day));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Attendance</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Show this code at check-in each day.
        </p>
      </div>

      <GlassCard strong className="flex flex-col items-center gap-4 py-8">
        <div className="rounded-2xl bg-white p-4">
          <QRCodeSVG value={qrValueForUser(user.id)} size={200} level="M" />
        </div>
        <div className="text-center">
          <p className="font-display text-base font-semibold">{user.name}</p>
          <p className="text-xs text-foreground-muted">{user.contact_number}</p>
        </div>
      </GlassCard>

      <div>
        <h2 className="mb-3 font-display text-base font-semibold">Your check-ins</h2>
        <div className="space-y-3">
          {EVENT_DAYS.map((d) => {
            const marked = markedDays.has(d.day);
            return (
              <GlassCard key={d.day} className="flex items-center justify-between py-3.5">
                <span className="text-sm font-medium">{d.label}</span>
                {marked ? (
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-saffron-deep">
                    <CheckCircle2 size={17} />
                    Checked in
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs text-foreground-muted">
                    <Circle size={17} />
                    Not yet
                  </span>
                )}
              </GlassCard>
            );
          })}
        </div>
      </div>
    </div>
  );
}
