"use client";

import { useEffect, useRef, useState } from "react";
import QrScanner from "qr-scanner";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarClock,
  CheckCircle2,
  Clock,
  Keyboard,
  PlayCircle,
  RotateCcw,
  ScanLine,
  Search,
  StopCircle,
  UserMinus,
  UserPlus,
  UserRoundPlus,
  XCircle,
} from "lucide-react";
import { useSession } from "@/lib/session";
import { canManagePeople } from "@/lib/admin";
import {
  markAttendance,
  listAttendanceLogs,
  searchPeople,
  deleteAttendance,
  registerPerson,
} from "@/lib/api/attendance";
import { getActiveEvent, launchEvent, endEvent } from "@/lib/api/events";
import { searchMandalOptions } from "@/lib/api/mandals";
import { GlassCard } from "@/components/ui/GlassCard";
import { Input } from "@/components/ui/Field";
import { SearchSelect } from "@/components/ui/SearchSelect";
import { Button } from "@/components/ui/Button";
import type { AttendanceLogEntry, Event, Mandal, ScanPerson } from "@/lib/api/types";

const QR_PREFIX = "YUVASABHA:";
const RESUME_DELAY_MS = 1200;
const LOG_REFRESH_MS = 1000;
const EVENT_REFRESH_MS = 2000;
const SEARCH_DEBOUNCE_MS = 250;
const RECENT_SCANS_LIMIT = 3;

interface ScanResult {
  id: string;
  name: string;
  status: "ok" | "duplicate" | "error";
  message: string;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
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

export default function ScanPage() {
  const { user, deviceToken } = useSession();
  const canLaunch = canManagePeople(user?.role);

  // ---- active event (undefined = still checking, null = confirmed none) ----
  const [activeEvent, setActiveEvent] = useState<Event | null | undefined>(undefined);
  const activeEventRef = useRef<Event | null>(null);
  const [launching, setLaunching] = useState(false);
  const [ending, setEnding] = useState(false);
  const eventActive = !!activeEvent;

  useEffect(() => {
    activeEventRef.current = activeEvent ?? null;
  }, [activeEvent]);

  // Polled (not just fetched once) so a scanner's "waiting" screen updates
  // as soon as an admin launches one elsewhere, and so this device notices
  // if another admin ends the Sabha mid-scan.
  useEffect(() => {
    if (!deviceToken) return;
    let cancelled = false;
    async function poll() {
      const { data } = await getActiveEvent();
      if (!cancelled) setActiveEvent(data);
    }
    poll();
    const interval = setInterval(poll, EVENT_REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [deviceToken]);

  async function handleLaunch() {
    if (!deviceToken) return;
    setLaunching(true);
    const { data, error } = await launchEvent(deviceToken, {});
    setLaunching(false);
    if (error) {
      alert(error);
      return;
    }
    setActiveEvent(data);
  }

  async function handleEnd() {
    if (!deviceToken || !activeEvent) return;
    if (!confirm(`End "${activeEvent.title}"? Attendees won't be able to check in anymore.`)) return;
    setEnding(true);
    const { error } = await endEvent(deviceToken, activeEvent.id);
    setEnding(false);
    if (error) {
      alert(error);
      return;
    }
    setActiveEvent(null);
  }

  // ---- scanner ----
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const busyRef = useRef(false);
  const [results, setResults] = useState<ScanResult[]>([]);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // ---- manual entry (find someone already in the system) ----
  const [manualOpen, setManualOpen] = useState(false);
  const [manualQuery, setManualQuery] = useState("");
  const [manualResults, setManualResults] = useState<ScanPerson[] | null>(null);
  const [manualSearching, setManualSearching] = useState(false);

  // ---- register a brand-new person (not in the system at all) ----
  const [newPersonOpen, setNewPersonOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newContact, setNewContact] = useState("");
  const [newMandal, setNewMandal] = useState<Mandal | null>(null);
  const [newSubmitting, setNewSubmitting] = useState(false);
  const [newError, setNewError] = useState<string | null>(null);
  const [newSuccess, setNewSuccess] = useState<string | null>(null);

  // ---- attendee log (always scoped to the active event) ----
  const [entries, setEntries] = useState<AttendanceLogEntry[] | null>(null);
  const [mandalFilter, setMandalFilter] = useState<Mandal | null>(null); // null = all Mandals
  const [logError, setLogError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fetchingRef = useRef(false);

  // ---- attendee log search: finds anyone in the system by name/contact,
  // not just people who already have a check-in — status is then read off
  // the already-polled `entries` below, so a search costs one lightweight
  // API call and zero extra round trips for attendance status. ----
  const [logQuery, setLogQuery] = useState("");
  const [logSearchResults, setLogSearchResults] = useState<ScanPerson[] | null>(null);
  const [logSearching, setLogSearching] = useState(false);
  const searchActive = logQuery.trim().length >= 2;

  useEffect(() => {
    if (!deviceToken) return;
    const q = logQuery.trim();
    if (q.length < 2) {
      setLogSearchResults(null);
      setLogSearching(false);
      return;
    }
    setLogSearching(true);
    const t = setTimeout(async () => {
      const { data } = await searchPeople(deviceToken, q);
      setLogSearchResults(data);
      setLogSearching(false);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [deviceToken, logQuery]);

  async function recordScan(targetUserId: string) {
    const event = activeEventRef.current;
    if (!deviceToken || !event) return;
    const { data, error } = await markAttendance(deviceToken, targetUserId, event.id);

    const newResult: ScanResult = data
      ? {
          id: `${data.attendance_id}-${Date.now()}`,
          name: data.name,
          status: data.already_marked ? "duplicate" : "ok",
          message: data.already_marked ? "Already checked in" : "Checked in",
        }
      : {
          id: `err-${Date.now()}`,
          name: "Scan failed",
          status: "error",
          message: error ?? "Something went wrong.",
        };

    setResults((prev) => [newResult, ...prev].slice(0, RECENT_SCANS_LIMIT));
  }

  // Camera only starts once a Sabha is live — re-runs on the false -> true
  // transition only (eventActive, not activeEvent itself), so the 2s event
  // poll refreshing the object's other fields doesn't restart the camera.
  useEffect(() => {
    if (!videoRef.current || !deviceToken || !eventActive) return;

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
      if (busyRef.current || !rawValue.startsWith(QR_PREFIX)) return;
      const [targetUserId, qrEventId] = rawValue.slice(QR_PREFIX.length).split(":");
      const event = activeEventRef.current;

      busyRef.current = true;
      scannerRef.current?.pause();

      // Reject client-side too (faster feedback) — the server independently
      // re-checks this on every mark, so a stale QR can't be forced through
      // even if this device's local `activeEvent` were somehow out of date.
      if (!event || qrEventId !== event.id) {
        setResults((prev) =>
          [
            {
              id: `err-${Date.now()}`,
              name: "Scan failed",
              status: "error" as const,
              message: "This code is for a different or past Sabha.",
            },
            ...prev,
          ].slice(0, RECENT_SCANS_LIMIT)
        );
      } else {
        await recordScan(targetUserId);
      }

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceToken, eventActive]);

  useEffect(() => {
    if (!deviceToken || !manualOpen) return;
    if (manualQuery.trim().length < 2) {
      setManualResults(null);
      return;
    }
    setManualSearching(true);
    const t = setTimeout(async () => {
      const { data } = await searchPeople(deviceToken, manualQuery);
      setManualResults(data);
      setManualSearching(false);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [deviceToken, manualQuery, manualOpen]);

  async function handleManualSelect(person: ScanPerson) {
    await recordScan(person.id);
    setManualQuery("");
    setManualResults(null);
  }

  async function handleRegisterPerson(e: React.FormEvent) {
    e.preventDefault();
    setNewError(null);
    setNewSuccess(null);

    const name = newName.trim();
    const contact = newContact.trim();

    if (name.length < 2) {
      setNewError("Please enter their full name.");
      return;
    }
    if (!/^\d{10}$/.test(contact)) {
      setNewError("Please enter a valid 10-digit contact number.");
      return;
    }
    if (!newMandal) {
      setNewError("Please select a Mandal.");
      return;
    }
    if (!deviceToken) return;

    setNewSubmitting(true);

    // Guard against accidental duplicates — this flow is meant for people
    // who genuinely aren't in the system yet.
    const { data: existing } = await searchPeople(deviceToken, contact);
    const exactMatch = existing?.find((p) => p.contact_number === contact);
    if (exactMatch) {
      setNewSubmitting(false);
      setNewError(
        `${contact} is already registered as "${exactMatch.name}" — use manual search above instead.`
      );
      return;
    }

    const { data: created, error } = await registerPerson(deviceToken, {
      name,
      contact_number: contact,
      mandal_id: newMandal.id,
    });
    setNewSubmitting(false);

    if (error || !created) {
      setNewError(error ?? "Could not register this person. Please try again.");
      return;
    }

    if (activeEventRef.current) {
      await recordScan(created.id);
      setNewSuccess("Registered and checked in.");
    } else {
      setNewSuccess("Registered. No Sabha is live, so they weren't checked in.");
    }

    setNewName("");
    setNewContact("");
  }

  async function handleDeleteEntry(entry: AttendanceLogEntry) {
    if (!deviceToken) return;
    if (!confirm(`Remove ${entry.attendee_name}'s check-in?`)) return;

    setDeletingId(entry.attendance_id);
    const { error } = await deleteAttendance(deviceToken, entry.attendance_id);
    setDeletingId(null);

    if (error) {
      alert(error);
      return;
    }
    setEntries((prev) => prev?.filter((e) => e.attendance_id !== entry.attendance_id) ?? prev);
  }

  useEffect(() => {
    if (!deviceToken || !activeEvent) {
      setEntries(null);
      return;
    }

    let cancelled = false;
    // While searching, ignore the Mandal filter server-side too — search
    // looks up anyone system-wide, and the filter UI is hidden during
    // search anyway (see below), so entries needs everyone for accurate
    // cross-referencing regardless of which Mandal is otherwise selected.
    const mandalId = searchActive ? undefined : (mandalFilter?.id ?? undefined);
    const eventId = activeEvent.id;

    async function tick() {
      if (fetchingRef.current) return;
      fetchingRef.current = true;
      const { data, error } = await listAttendanceLogs(deviceToken!, {
        event_id: eventId,
        mandal_id: mandalId,
        per_page: 100,
      });
      fetchingRef.current = false;
      if (cancelled) return;
      if (error) setLogError(error);
      else {
        setLogError(null);
        setEntries(data?.data ?? []);
      }
    }

    tick();
    const interval = setInterval(tick, LOG_REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // activeEvent?.id (not the object) — the object gets a new reference on
    // every 2s poll even when nothing changed, which would otherwise restart
    // this interval for no reason.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceToken, activeEvent?.id, mandalFilter, searchActive]);

  const visible = entries;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ScanLine className="text-saffron-deep" size={22} />
          <h1 className="font-display text-2xl font-semibold">Scan</h1>
        </div>
        <button
          type="button"
          onClick={() => {
            setNewError(null);
            setNewSuccess(null);
            setNewPersonOpen((v) => !v);
          }}
          className="flex items-center gap-1.5 rounded-full bg-saffron-deep/10 px-3 py-2 text-sm font-semibold text-saffron-deep"
        >
          <UserRoundPlus size={16} />
          New Person
        </button>
      </div>

      <AnimatePresence initial={false}>
        {newPersonOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <GlassCard strong className="space-y-4">
              <div>
                <p className="mb-1 text-sm font-semibold">Register a new person</p>
                <p className="text-xs text-foreground-muted">
                  For someone who isn&apos;t in the system yet.
                  {eventActive
                    ? " They'll be checked in for today's Sabha right away."
                    : " No Sabha is live, so they'll just be registered."}
                </p>
              </div>

              <form onSubmit={handleRegisterPerson} className="space-y-3">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Full name"
                  autoComplete="name"
                />
                <Input
                  value={newContact}
                  onChange={(e) => setNewContact(e.target.value.replace(/[^\d]/g, "").slice(0, 10))}
                  placeholder="10-digit mobile number"
                  inputMode="numeric"
                  autoComplete="tel"
                />
                <SearchSelect
                  value={newMandal}
                  onChange={setNewMandal}
                  onSearch={searchMandalOptions}
                  getId={(m) => m.id}
                  getLabel={(m) => m.name}
                  placeholder="Select their Mandal…"
                />

                {newError && <p className="text-sm text-red-500">{newError}</p>}
                {newSuccess && <p className="text-sm text-saffron-deep">{newSuccess}</p>}

                <Button type="submit" disabled={newSubmitting} className="w-full">
                  {newSubmitting ? "Registering…" : "Register"}
                </Button>
              </form>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------- event status ---------- */}
      {activeEvent === undefined && (
        <GlassCard className="py-8 text-center text-sm text-foreground-muted">
          Checking for a live Sabha…
        </GlassCard>
      )}

      {activeEvent === null && canLaunch && (
        <GlassCard strong className="flex flex-col items-center gap-3 py-8 text-center">
          <CalendarClock className="text-foreground-muted" size={26} />
          <div>
            <p className="font-display text-base font-semibold">No Sabha is live</p>
            <p className="mt-1 text-sm text-foreground-muted">
              Launch one when today&apos;s Yuva Sabha begins — everyone will see it immediately.
            </p>
          </div>
          <Button type="button" onClick={handleLaunch} disabled={launching}>
            <PlayCircle size={16} />
            {launching ? "Launching…" : "Launch Yuva Sabha"}
          </Button>
        </GlassCard>
      )}

      {activeEvent === null && !canLaunch && (
        <GlassCard className="py-8 text-center text-sm text-foreground-muted">
          Waiting for an admin to launch today&apos;s Sabha.
        </GlassCard>
      )}

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
          {canLaunch && (
            <button
              type="button"
              onClick={handleEnd}
              disabled={ending}
              className="flex shrink-0 items-center gap-1.5 rounded-full bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-500 disabled:opacity-50"
            >
              <StopCircle size={14} />
              {ending ? "Ending…" : "End Sabha"}
            </button>
          )}
        </GlassCard>
      )}

      {activeEvent && (
        <>
          {/* ---------- scanner ---------- */}
          <div className="space-y-4">
            <p className="text-sm text-foreground-muted">
              Point the camera at an attendee&apos;s QR code.
            </p>

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

            {/* ---------- manual entry ---------- */}
            <button
              type="button"
              onClick={() => setManualOpen((v) => !v)}
              className="flex w-full items-center justify-center gap-2 py-1 text-sm font-medium text-saffron-deep"
            >
              <Keyboard size={16} />
              {manualOpen ? "Hide manual entry" : "Can't scan? Enter manually"}
            </button>

            <AnimatePresence initial={false}>
              {manualOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <GlassCard strong className="space-y-3">
                    <div className="relative">
                      <Search
                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-foreground-muted"
                        size={16}
                      />
                      <Input
                        value={manualQuery}
                        onChange={(e) => setManualQuery(e.target.value)}
                        placeholder="Search by name or contact number…"
                        className="pl-10"
                      />
                    </div>

                    {manualSearching && (
                      <p className="text-center text-xs text-foreground-muted">Searching…</p>
                    )}

                    {!manualSearching && manualResults && manualResults.length === 0 && (
                      <p className="text-center text-xs text-foreground-muted">No matches.</p>
                    )}

                    {!manualSearching && manualResults && manualResults.length > 0 && (
                      <div className="space-y-2">
                        {manualResults.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => handleManualSelect(p)}
                            className="flex w-full items-center justify-between rounded-2xl bg-background-elevated/70 px-3 py-2.5 text-left"
                          >
                            <span>
                              <span className="block text-sm font-medium">{p.name}</span>
                              <span className="block text-xs text-foreground-muted">
                                {p.contact_number}
                              </span>
                            </span>
                            <UserPlus size={16} className="shrink-0 text-saffron-deep" />
                          </button>
                        ))}
                      </div>
                    )}
                  </GlassCard>
                </motion.div>
              )}
            </AnimatePresence>

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

            {!searchActive && (
              <GlassCard className="flex items-center justify-between py-3.5">
                <span className="text-sm font-medium">Checked in</span>
                <motion.span
                  key={entries?.length ?? 0}
                  initial={{ scale: 1.3, opacity: 0.6 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  className="font-display text-xl font-semibold text-saffron-deep"
                >
                  {entries?.length ?? 0}
                </motion.span>
              </GlassCard>
            )}

            {!searchActive && (
              <SearchSelect
                value={mandalFilter}
                onChange={setMandalFilter}
                onSearch={searchMandalOptions}
                getId={(m) => m.id}
                getLabel={(m) => m.name}
                placeholder="All Mandals"
                clearable
                clearLabel="All Mandals"
                onClear={() => setMandalFilter(null)}
              />
            )}

            <div className="relative">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-foreground-muted"
                size={16}
              />
              <Input
                value={logQuery}
                onChange={(e) => setLogQuery(e.target.value)}
                placeholder="Find anyone by name or contact number…"
                className="pl-10"
              />
            </div>

            {logError && (
              <GlassCard className="text-center text-sm text-foreground-muted">{logError}</GlassCard>
            )}

            {/* ---------- search mode: any person, checked in or not ---------- */}
            {searchActive && (
              <>
                {logSearching && (
                  <p className="py-6 text-center text-xs text-foreground-muted">Searching…</p>
                )}

                {!logSearching && logSearchResults && logSearchResults.length === 0 && (
                  <p className="py-8 text-center text-sm text-foreground-muted">No one found.</p>
                )}

                {!logSearching && logSearchResults && logSearchResults.length > 0 && (
                  <div className="space-y-3">
                    <AnimatePresence initial={false}>
                      {logSearchResults.map((p) => {
                        const entry = entries?.find((e) => e.user_id === p.id) ?? null;

                        return (
                          <motion.div
                            key={p.id}
                            layout
                            initial={{ opacity: 0, y: -16, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.97 }}
                            transition={{ type: "spring", stiffness: 400, damping: 32 }}
                          >
                            <GlassCard className="flex items-center gap-3 py-3">
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold">{p.name}</p>
                                <p className="truncate text-xs text-foreground-muted">
                                  {p.contact_number}
                                </p>
                              </div>

                              {!entry ? (
                                <span className="shrink-0 rounded-full bg-foreground/5 px-2.5 py-1 text-[11px] font-medium text-foreground-muted">
                                  Not checked in
                                </span>
                              ) : (
                                <span className="flex shrink-0 items-center gap-1 rounded-full bg-saffron-deep/12 py-0.5 pl-2 pr-1 text-[11px] font-semibold text-saffron-deep">
                                  <CheckCircle2 size={11} />
                                  Checked in
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteEntry(entry)}
                                    disabled={deletingId === entry.attendance_id}
                                    aria-label={`Remove ${p.name}'s check-in`}
                                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-saffron-deep/70 hover:text-red-500 disabled:opacity-40"
                                  >
                                    <UserMinus size={12} />
                                  </button>
                                </span>
                              )}
                            </GlassCard>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                )}
              </>
            )}

            {/* ---------- normal mode: check-ins for the active Sabha ---------- */}
            {!searchActive && (
              <>
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
                            <p className="flex shrink-0 items-center gap-1 text-[11px] text-foreground-muted">
                              <Clock size={11} />
                              {formatTime(e.scanned_at)}
                            </p>
                            <button
                              type="button"
                              onClick={() => handleDeleteEntry(e)}
                              disabled={deletingId === e.attendance_id}
                              aria-label={`Remove ${e.attendee_name}'s check-in`}
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-500 disabled:opacity-40"
                            >
                              <UserMinus size={16} />
                            </button>
                          </GlassCard>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
