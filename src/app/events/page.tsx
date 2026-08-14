"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarPlus, CheckCircle2, Clock, StopCircle } from "lucide-react";
import { useSession } from "@/lib/session";
import { getActiveEvent, launchEvent, endEvent, listEvents } from "@/lib/api/events";
import { GlassCard, staggerContainer, staggerItem } from "@/components/ui/GlassCard";
import { Input, Label } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import type { Event } from "@/lib/api/types";

const REFRESH_MS = 3000;

function formatEventTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function toDatetimeLocalValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

export default function EventsPage() {
  const { deviceToken } = useSession();
  const [activeEvent, setActiveEvent] = useState<Event | null | undefined>(undefined);
  const [events, setEvents] = useState<Event[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [when, setWhen] = useState(() => toDatetimeLocalValue(new Date()));
  const [scheduling, setScheduling] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [scheduleSuccess, setScheduleSuccess] = useState<string | null>(null);
  const [endingId, setEndingId] = useState<string | null>(null);

  useEffect(() => {
    if (!deviceToken) return;
    let cancelled = false;

    async function poll() {
      const [activeRes, listRes] = await Promise.all([getActiveEvent(), listEvents(deviceToken!)]);
      if (cancelled) return;
      setActiveEvent(activeRes.data);
      if (listRes.error) setListError(listRes.error);
      else {
        setListError(null);
        setEvents(listRes.data?.data ?? []);
      }
    }

    poll();
    const interval = setInterval(poll, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [deviceToken]);

  async function handleSchedule(e: React.FormEvent) {
    e.preventDefault();
    setScheduleError(null);
    setScheduleSuccess(null);
    if (!deviceToken) return;
    if (!when) {
      setScheduleError("Pick a date and time.");
      return;
    }

    setScheduling(true);
    const scheduledAt = new Date(when).toISOString();
    const { data, error } = await launchEvent(deviceToken, {
      title: title.trim() || undefined,
      scheduled_at: scheduledAt,
    });
    setScheduling(false);

    if (error || !data) {
      setScheduleError(error ?? "Could not schedule this Sabha.");
      return;
    }

    setScheduleSuccess(
      data.status === "active"
        ? "Launched — it's live now."
        : `Scheduled for ${formatEventTime(data.scheduled_at)}.`
    );
    setTitle("");
    setWhen(toDatetimeLocalValue(new Date()));
    if (data.status === "active") setActiveEvent(data);
    setEvents((prev) => (prev ? [data, ...prev] : [data]));
  }

  async function handleEnd(event: Event) {
    if (!deviceToken) return;
    const verb = event.status === "active" ? "End" : "Cancel";
    if (!confirm(`${verb} "${event.title}"?`)) return;

    setEndingId(event.id);
    const { error } = await endEvent(deviceToken, event.id);
    setEndingId(null);

    if (error) {
      alert(error);
      return;
    }
    setEvents(
      (prev) => prev?.map((e) => (e.id === event.id ? { ...e, status: "ended" as const } : e)) ?? prev
    );
    if (activeEvent?.id === event.id) setActiveEvent(null);
  }

  const upcoming =
    events
      ?.filter((e) => e.status === "scheduled")
      .sort((a, b) => (a.scheduled_at < b.scheduled_at ? -1 : 1)) ?? [];
  const past = events?.filter((e) => e.status === "ended") ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <CalendarPlus className="text-saffron-deep" size={22} />
        <h1 className="font-display text-2xl font-semibold">Sabhas</h1>
      </div>

      <GlassCard strong className="space-y-4">
        <div>
          <p className="mb-1 text-sm font-semibold">Schedule a Sabha</p>
          <p className="text-xs text-foreground-muted">
            Set it for right now to launch immediately, or pick a future time — it goes live on
            its own, no need to come back and press launch.
          </p>
        </div>

        <form onSubmit={handleSchedule} className="space-y-3">
          <div>
            <Label>Title (optional)</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Yuva Sabha" />
          </div>
          <div>
            <Label>Date &amp; time</Label>
            <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
          </div>

          {scheduleError && <p className="text-sm text-red-500">{scheduleError}</p>}
          {scheduleSuccess && <p className="text-sm text-saffron-deep">{scheduleSuccess}</p>}

          <Button type="submit" disabled={scheduling} className="w-full">
            {scheduling ? "Scheduling…" : "Schedule"}
          </Button>
        </form>
      </GlassCard>

      {activeEvent && (
        <GlassCard strong className="flex items-center justify-between gap-3 py-4">
          <div className="min-w-0">
            <p className="truncate font-display text-base font-semibold text-saffron-deep">
              {activeEvent.title} · Live
            </p>
            <p className="text-xs text-foreground-muted">
              {formatEventTime(activeEvent.scheduled_at)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleEnd(activeEvent)}
            disabled={endingId === activeEvent.id}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-500 disabled:opacity-50"
          >
            <StopCircle size={14} />
            End
          </button>
        </GlassCard>
      )}

      {listError && (
        <GlassCard className="text-center text-sm text-foreground-muted">{listError}</GlassCard>
      )}

      <div>
        <h2 className="mb-3 font-display text-base font-semibold">Upcoming</h2>
        {events === null ? (
          <div className="space-y-3">
            {[0, 1].map((i) => (
              <div key={i} className="glass-card h-16 animate-pulse rounded-3xl" />
            ))}
          </div>
        ) : upcoming.length === 0 ? (
          <GlassCard className="text-center text-sm text-foreground-muted">
            Nothing scheduled.
          </GlassCard>
        ) : (
          <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-3">
            <AnimatePresence initial={false}>
              {upcoming.map((event) => (
                <motion.div
                  key={event.id}
                  variants={staggerItem}
                  layout
                  exit={{ opacity: 0, scale: 0.97 }}
                >
                  <GlassCard className="flex items-center justify-between gap-3 py-3.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{event.title}</p>
                      <p className="flex items-center gap-1 text-xs text-foreground-muted">
                        <Clock size={12} />
                        {formatEventTime(event.scheduled_at)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleEnd(event)}
                      disabled={endingId === event.id}
                      className="shrink-0 rounded-full bg-foreground/5 px-3 py-1.5 text-xs font-semibold text-foreground-muted disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </GlassCard>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      <div>
        <h2 className="mb-3 font-display text-base font-semibold">Past</h2>
        {events !== null && past.length === 0 && (
          <GlassCard className="text-center text-sm text-foreground-muted">No Sabhas yet.</GlassCard>
        )}
        {past.length > 0 && (
          <div className="space-y-3">
            {past.map((event) => (
              <GlassCard key={event.id} className="flex items-center gap-3 py-3">
                <CheckCircle2 className="shrink-0 text-foreground-muted" size={18} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{event.title}</p>
                  <p className="text-xs text-foreground-muted">{formatEventTime(event.scheduled_at)}</p>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
