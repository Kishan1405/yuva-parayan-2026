export const EVENT_NAME = "Yuva Parayan 2026";

export interface EventDay {
  day: 1 | 2 | 3;
  date: string; // YYYY-MM-DD
  label: string;
}

export const EVENT_DAYS: EventDay[] = [
  { day: 1, date: "2026-08-06", label: "Day 1 · Thu, 6 Aug 2026" },
  { day: 2, date: "2026-08-07", label: "Day 2 · Fri, 7 Aug 2026" },
  { day: 3, date: "2026-08-08", label: "Day 3 · Sat, 8 Aug 2026" },
];

// Local calendar date as YYYY-MM-DD, so the gate flips at local midnight.
export function todayIso(): string {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
}

// A day's feedback form unlocks once that day has begun (local time) and stays open after.
export function isFeedbackUnlocked(day: EventDay): boolean {
  return todayIso() >= day.date;
}

export function currentEventDay(): EventDay | null {
  const today = todayIso();
  return EVENT_DAYS.find((d) => d.date === today) ?? null;
}

export type EventPhase = "upcoming" | "live" | "ended";

export function eventPhase(): EventPhase {
  const today = todayIso();
  if (today < EVENT_DAYS[0].date) return "upcoming";
  if (today > EVENT_DAYS[EVENT_DAYS.length - 1].date) return "ended";
  return "live";
}

export function daysUntilStart(): number {
  const start = new Date(`${EVENT_DAYS[0].date}T00:00:00`);
  const now = new Date(`${todayIso()}T00:00:00`);
  return Math.round((start.getTime() - now.getTime()) / 86_400_000);
}
