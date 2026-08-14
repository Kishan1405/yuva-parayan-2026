"use client";

import { useEffect, useState, type ComponentType } from "react";
import { motion } from "framer-motion";
import { BarChart3, CalendarCheck, ClipboardList, LayoutGrid, Users } from "lucide-react";
import { useSession } from "@/lib/session";
import { getAnalytics } from "@/lib/api/analytics";
import { GlassCard, staggerContainer, staggerItem } from "@/components/ui/GlassCard";
import { Select } from "@/components/ui/Field";
import { BarChart } from "@/components/charts/BarChart";
import { DonutChart, type DonutDatum } from "@/components/charts/DonutChart";
import type { AnalyticsData } from "@/lib/api/types";

// Validated categorical order (see references/palette.md) — fixed, never
// cycled. Only the Mandal donut needs identity color; every bar chart below
// is a single-hue magnitude encoding and uses the brand saffron instead.
const MANDAL_COLORS = ["#2a78d6", "#008300", "#e87ba4", "#eda100"];

function formatEventLabel(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function StatTile({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: ComponentType<{ size?: number; className?: string }>;
}) {
  return (
    <GlassCard className="flex flex-col gap-1 !p-4">
      <div className="flex items-center gap-1.5 text-foreground-muted">
        <Icon size={14} />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <span className="text-2xl font-semibold tabular-nums">{value.toLocaleString()}</span>
    </GlassCard>
  );
}

export default function AnalyticsPage() {
  const { deviceToken } = useSession();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!deviceToken) return;
    setLoading(true);
    getAnalytics(deviceToken).then(({ data, error }) => {
      setData(data);
      setError(error);
      setLoading(false);
      const mostRecent = data?.attendance_by_event[data.attendance_by_event.length - 1];
      if (mostRecent) setSelectedEventId(mostRecent.event_id);
    });
  }, [deviceToken]);

  async function handleEventChange(eventId: string) {
    if (!deviceToken) return;
    setSelectedEventId(eventId);
    setLoading(true);
    const { data, error } = await getAnalytics(deviceToken, eventId);
    setData(data);
    setError(error);
    setLoading(false);
  }

  const eventData =
    data?.attendance_by_event.map((e) => ({
      key: e.event_id,
      label: formatEventLabel(e.scheduled_at),
      value: e.count,
    })) ?? [];

  // Drop the "No Mandal" bucket unless it actually has someone in it — it's
  // usually empty since Mandal is required at signup.
  const mandalAttendanceData =
    data?.attendance_by_mandal_for_event.filter((r) => r.mandal_id !== null || r.count > 0) ?? [];

  const deptData =
    data?.people_by_department.map((d) => ({
      key: d.department_id,
      label: d.name,
      value: d.count,
    })) ?? [];

  // Fixed-order categorical slots, never generated — past 4, fold the tail
  // into "Other" rather than inventing a 5th hue.
  let mandalSlices: DonutDatum[] = [];
  if (data) {
    if (data.people_by_mandal.length <= 4) {
      mandalSlices = data.people_by_mandal.map((m, i) => ({
        key: m.mandal_id ?? "none",
        label: m.name,
        value: m.count,
        color: MANDAL_COLORS[i],
      }));
    } else {
      const top = data.people_by_mandal.slice(0, 3);
      const restCount = data.people_by_mandal.slice(3).reduce((sum, m) => sum + m.count, 0);
      mandalSlices = [
        ...top.map((m, i) => ({
          key: m.mandal_id ?? "none",
          label: m.name,
          value: m.count,
          color: MANDAL_COLORS[i],
        })),
        { key: "other", label: "Other", value: restCount, color: MANDAL_COLORS[3] },
      ];
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <BarChart3 className="text-saffron-deep" size={22} />
        <h1 className="font-display text-2xl font-semibold">Analytics</h1>
      </div>

      {loading && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="glass-card h-32 animate-pulse rounded-3xl" />
          ))}
        </div>
      )}

      {!loading && error && <p className="text-sm text-red-500">{error}</p>}

      {!loading && data && (
        <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-6">
          <motion.div variants={staggerItem} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="Total people" value={data.total_people} icon={Users} />
            <StatTile label="Checked in" value={data.unique_attendees} icon={CalendarCheck} />
            <StatTile label="Total check-ins" value={data.total_checkins} icon={ClipboardList} />
            <StatTile
              label="Departments active"
              value={data.people_by_department.length}
              icon={LayoutGrid}
            />
          </motion.div>

          <motion.div variants={staggerItem}>
            <GlassCard>
              <h2 className="mb-1 font-display text-base font-semibold">Attendance by Sabha</h2>
              <p className="mb-5 text-xs text-foreground-muted">
                Check-ins per Sabha, most recent {eventData.length || 0}
              </p>
              {eventData.length === 0 ? (
                <p className="py-6 text-center text-sm text-foreground-muted">
                  No Sabhas have happened yet.
                </p>
              ) : (
                <BarChart data={eventData} orientation="horizontal" />
              )}
            </GlassCard>
          </motion.div>

          <motion.div variants={staggerItem}>
            <GlassCard>
              <div className="mb-1 flex items-center justify-between gap-2">
                <h2 className="font-display text-base font-semibold">Attendance by Mandal</h2>
              </div>
              <p className="mb-4 text-xs text-foreground-muted">Check-ins per Mandal for one Sabha</p>
              {data.attendance_by_event.length > 0 && (
                <div className="mb-5">
                  <Select
                    value={selectedEventId ?? ""}
                    onChange={(e) => handleEventChange(e.target.value)}
                  >
                    {data.attendance_by_event.map((ev) => (
                      <option key={ev.event_id} value={ev.event_id}>
                        {ev.title} · {formatEventLabel(ev.scheduled_at)}
                      </option>
                    ))}
                  </Select>
                </div>
              )}
              {mandalAttendanceData.length === 0 ? (
                <p className="py-6 text-center text-sm text-foreground-muted">
                  No check-ins for this Sabha yet.
                </p>
              ) : (
                <BarChart
                  data={mandalAttendanceData.map((r) => ({
                    key: r.mandal_id ?? "none",
                    label: r.name,
                    value: r.count,
                  }))}
                  orientation="vertical"
                  height={180}
                />
              )}
            </GlassCard>
          </motion.div>

          <motion.div variants={staggerItem}>
            <GlassCard>
              <h2 className="mb-1 font-display text-base font-semibold">People by Mandal</h2>
              <p className="mb-5 text-xs text-foreground-muted">
                {data.total_people.toLocaleString()} people registered
              </p>
              <DonutChart data={mandalSlices} />
            </GlassCard>
          </motion.div>

          {deptData.length > 0 && (
            <motion.div variants={staggerItem}>
              <GlassCard>
                <h2 className="mb-1 font-display text-base font-semibold">People by Department</h2>
                <p className="mb-5 text-xs text-foreground-muted">
                  Seva assignments · {data.unassigned_department_count.toLocaleString()} not yet
                  assigned
                </p>
                <BarChart data={deptData} orientation="horizontal" />
              </GlassCard>
            </motion.div>
          )}

          <motion.div variants={staggerItem}>
            <GlassCard>
              <h2 className="mb-4 font-display text-base font-semibold">Roles</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {data.people_by_role.map((r) => (
                  <div key={r.role} className="rounded-2xl bg-foreground/5 p-3 text-center">
                    <p className="text-lg font-semibold tabular-nums">{r.count.toLocaleString()}</p>
                    <p className="text-[11px] text-foreground-muted">{r.role.replace("_", " ")}</p>
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
