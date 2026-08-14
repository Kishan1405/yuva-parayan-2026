"use client";

import { useEffect, useRef, useState } from "react";
import QrScanner from "qr-scanner";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Clock,
  Keyboard,
  RotateCcw,
  ScanLine,
  Search,
  UserMinus,
  UserPlus,
  UserRoundPlus,
  XCircle,
} from "lucide-react";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import {
  markAttendance,
  listAttendance,
  scanSearchPeople,
  deleteAttendance,
  registerPerson,
} from "@/lib/admin";
import { EVENT_DAYS } from "@/lib/event";
import { GlassCard, staggerContainer, staggerItem } from "@/components/ui/GlassCard";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Input, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import type { AttendanceLogEntry, Mandal, ScanPerson } from "@/lib/database.types";

const QR_PREFIX = "YP2026:";
const RESUME_DELAY_MS = 1200;
const LOG_REFRESH_MS = 1000;
const SEARCH_DEBOUNCE_MS = 250;
const RECENT_SCANS_LIMIT = 3;

type Day = 1 | 2 | 3;

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

  // ---- day (mandatory, no default) ----
  const [day, setDay] = useState<Day | null>(null);
  const dayRef = useRef<Day | null>(day);
  const daySelected = day !== null;

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
  const [mandals, setMandals] = useState<Mandal[]>([]);
  const [newPersonOpen, setNewPersonOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newContact, setNewContact] = useState("");
  const [newMandalId, setNewMandalId] = useState("");
  const [newSubmitting, setNewSubmitting] = useState(false);
  const [newError, setNewError] = useState<string | null>(null);
  const [newSuccess, setNewSuccess] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("mandals")
      .select("*")
      .order("sort_order")
      .then(({ data }) => {
        if (data) {
          setMandals(data);
          if (data.length > 0) setNewMandalId((prev) => prev || data[0].id);
        }
      });
  }, []);

  // ---- attendee log ----
  const [entries, setEntries] = useState<AttendanceLogEntry[] | null>(null);
  const [dayFilter, setDayFilter] = useState<number | "all">("all");
  const [mandalFilter, setMandalFilter] = useState<string>("all"); // "all" | mandal id
  const [logError, setLogError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fetchingRef = useRef(false);

  // ---- attendee log search: finds anyone in the system by name/contact,
  // not just people who already have a check-in — status is then read off
  // the already-polled `entries` below, so a search costs one lightweight
  // RPC call and zero extra round trips for attendance status. ----
  const [logQuery, setLogQuery] = useState("");
  const [logSearchResults, setLogSearchResults] = useState<ScanPerson[] | null>(null);
  const [logSearching, setLogSearching] = useState(false);

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
      const { data } = await scanSearchPeople(deviceToken, q);
      setLogSearchResults(data);
      setLogSearching(false);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [deviceToken, logQuery]);

  useEffect(() => {
    dayRef.current = day;
  }, [day]);

  async function recordScan(targetUserId: string) {
    if (!deviceToken || dayRef.current === null) return;
    const { data, error } = await markAttendance(deviceToken, targetUserId, dayRef.current);

    const newResult: ScanResult = data
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
        };

    setResults((prev) => [newResult, ...prev].slice(0, RECENT_SCANS_LIMIT));
  }

  // Camera only starts once a day has been chosen — re-runs on the
  // false -> true transition only (daySelected, not day itself), so
  // switching days later doesn't restart the camera.
  useEffect(() => {
    if (!videoRef.current || !deviceToken || !daySelected) return;

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
      const targetUserId = rawValue.slice(QR_PREFIX.length);

      busyRef.current = true;
      scannerRef.current?.pause();
      await recordScan(targetUserId);
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
  }, [deviceToken, daySelected]);

  useEffect(() => {
    if (!deviceToken || !manualOpen) return;
    if (manualQuery.trim().length < 2) {
      setManualResults(null);
      return;
    }
    setManualSearching(true);
    const t = setTimeout(async () => {
      const { data } = await scanSearchPeople(deviceToken, manualQuery);
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
    if (!newMandalId) {
      setNewError("Please select a Mandal.");
      return;
    }
    if (!deviceToken) return;

    setNewSubmitting(true);

    // Guard against accidental duplicates — this flow is meant for people
    // who genuinely aren't in the system yet.
    const { data: existing } = await scanSearchPeople(deviceToken, contact);
    const exactMatch = existing.find((p) => p.contact_number === contact);
    if (exactMatch) {
      setNewSubmitting(false);
      setNewError(
        `${contact} is already registered as "${exactMatch.name}" — use manual search above instead.`
      );
      return;
    }

    const { data: created, error } = await registerPerson(name, contact, newMandalId);
    setNewSubmitting(false);

    if (error || !created) {
      setNewError(error ?? "Could not register this person. Please try again.");
      return;
    }

    if (dayRef.current !== null) {
      await recordScan(created.id);
      setNewSuccess(`Registered and checked in — Day ${dayRef.current}.`);
    } else {
      setNewSuccess("Registered. Select a day above to check them in.");
    }

    setNewName("");
    setNewContact("");
  }

  async function handleDeleteEntry(entry: AttendanceLogEntry) {
    if (!deviceToken) return;
    if (!confirm(`Remove ${entry.attendee_name}'s Day ${entry.day} check-in?`)) return;

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

  // Day tiles + the list both respect the Mandal filter, so the tiles
  // double as the "count for this Mandal" the filter needs to show.
  const mandalFilteredEntries =
    mandalFilter === "all" ? entries : entries?.filter((e) => e.mandal_id === mandalFilter) ?? null;

  const counts = EVENT_DAYS.map((d) => ({
    day: d.day,
    count: mandalFilteredEntries?.filter((e) => e.day === d.day).length ?? 0,
  }));

  const visible =
    dayFilter === "all"
      ? mandalFilteredEntries
      : mandalFilteredEntries?.filter((e) => e.day === dayFilter) ?? null;

  const searchActive = logQuery.trim().length >= 2;

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
                  {daySelected
                    ? ` They'll be checked in for Day ${day} right away.`
                    : " Select a day above to also check them in."}
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
                <Select value={newMandalId} onChange={(e) => setNewMandalId(e.target.value)}>
                  {mandals.length === 0 && <option value="">Loading Mandals…</option>}
                  {mandals.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </Select>

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

      {/* ---------- day selection (mandatory) ---------- */}
      <div className="space-y-3">
        <p className="text-sm font-medium">
          {daySelected ? "Recording attendance for" : "Select a day to begin"}
        </p>
        <SegmentedControl
          options={EVENT_DAYS.map((d) => ({ value: String(d.day), label: `Day ${d.day}` }))}
          value={day === null ? "" : String(day)}
          onChange={(v) => setDay(Number(v) as Day)}
        />
      </div>

      {!daySelected && (
        <GlassCard className="text-center text-sm text-foreground-muted">
          Pick a day above to open the scanner.
        </GlassCard>
      )}

      {daySelected && (
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
        </>
      )}

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

        {!searchActive && (
          <div className="flex items-center gap-2">
            <Select
              value={mandalFilter}
              onChange={(e) => setMandalFilter(e.target.value)}
              className="flex-1"
            >
              <option value="all">All Mandals</option>
              {mandals.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </Select>
            <span className="shrink-0 whitespace-nowrap text-xs text-foreground-muted">
              {visible?.length ?? 0} check-in{visible?.length === 1 ? "" : "s"}
            </span>
          </div>
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

        {!searchActive && (
          <SegmentedControl
            options={[
              { value: "all", label: "All" },
              ...EVENT_DAYS.map((d) => ({ value: String(d.day), label: `Day ${d.day}` })),
            ]}
            value={String(dayFilter)}
            onChange={(v) => setDayFilter(v === "all" ? "all" : Number(v))}
          />
        )}

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
                    const personEntries = entries?.filter((e) => e.user_id === p.id) ?? [];
                    const relevant =
                      dayFilter === "all"
                        ? personEntries
                        : personEntries.filter((e) => e.day === dayFilter);

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

                          {relevant.length === 0 ? (
                            <span className="shrink-0 rounded-full bg-foreground/5 px-2.5 py-1 text-[11px] font-medium text-foreground-muted">
                              Not checked in{dayFilter !== "all" && ` — Day ${dayFilter}`}
                            </span>
                          ) : (
                            <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                              {relevant.map((e) => (
                                <span
                                  key={e.attendance_id}
                                  className="flex items-center gap-1 rounded-full bg-saffron-deep/12 py-0.5 pl-2 pr-1 text-[11px] font-semibold text-saffron-deep"
                                >
                                  <CheckCircle2 size={11} />
                                  Day {e.day}
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteEntry(e)}
                                    disabled={deletingId === e.attendance_id}
                                    aria-label={`Remove ${p.name}'s Day ${e.day} check-in`}
                                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-saffron-deep/70 hover:text-red-500 disabled:opacity-40"
                                  >
                                    <UserMinus size={12} />
                                  </button>
                                </span>
                              ))}
                            </div>
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

        {/* ---------- normal mode: day-filtered attendance list ---------- */}
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
                        <div className="shrink-0 text-right">
                          <span className="rounded-full bg-saffron-deep/12 px-2 py-0.5 text-[11px] font-semibold text-saffron-deep">
                            Day {e.day}
                          </span>
                          <p className="mt-1 flex items-center gap-1 text-[11px] text-foreground-muted">
                            <Clock size={11} />
                            {formatTime(e.scanned_at)}
                          </p>
                        </div>
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
    </div>
  );
}
