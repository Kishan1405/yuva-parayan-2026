"use client";

import { useEffect, useState, type ComponentType } from "react";
import { motion } from "framer-motion";
import { BarChart3, CalendarCheck, ClipboardList, LayoutGrid, Users } from "lucide-react";
import { useSession } from "@/lib/session";
import { getAnalytics } from "@/lib/admin";
import { EVENT_DAYS, currentEventDay } from "@/lib/event";
import { GlassCard, staggerContainer, staggerItem } from "@/components/ui/GlassCard";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { BarChart } from "@/components/charts/BarChart";
import { DonutChart, type DonutDatum } from "@/components/charts/DonutChart";
import type { AnalyticsData } from "@/lib/database.types";

// Validated categorical order (see references/palette.md) — fixed, never
// cycled. Only the Mandal donut needs identity color; every bar chart below
// is a single-hue magnitude encoding and uses the brand saffron instead.
const MANDAL_COLORS = ["#2a78d6", "#008300", "#e87ba4", "#eda100"];

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mandalAttendanceDay, setMandalAttendanceDay] = useState<number>(
    currentEventDay()?.day ?? 1
  );

  useEffect(() => {
    if (!deviceToken) return;
    getAnalytics(deviceToken).then(({ data, error }) => {
      setData(data);
      setError(error);
      setLoading(false);
    });
  }, [deviceToken]);

  const dayData =
    data?.attendance_by_day.map((d) => ({
      key: String(d.day),
      label: `Day ${d.day}`,
      value: d.count,
    })) ?? [];

  // Drop the "No Mandal" bucket unless it actually has someone in it — it's
  // usually empty since Mandal is required at signup.
  const mandalAttendanceData =
    data?.attendance_by_mandal_and_day
      .filter((r) => r.day === mandalAttendanceDay)
      .filter((r) => r.mandal_id !== null || r.count > 0)
      .map((r) => ({ key: r.mandal_id ?? "none", label: r.name, value: r.count })) ?? [];

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
              <h2 className="mb-1 font-display text-base font-semibold">Daily attendance</h2>
              <p className="mb-5 text-xs text-foreground-muted">Check-ins scanned per day</p>
              <BarChart data={dayData} orientation="vertical" height={180} />
            </GlassCard>
          </motion.div>

          <motion.div variants={staggerItem}>
            <GlassCard>
              <div className="mb-1 flex items-center justify-between gap-2">
                <h2 className="font-display text-base font-semibold">Attendance by Mandal</h2>
              </div>
              <p className="mb-4 text-xs text-foreground-muted">
                Check-ins per Mandal for the selected day
              </p>
              <div className="mb-5">
                <SegmentedControl
                  options={EVENT_DAYS.map((d) => ({ value: String(d.day), label: `Day ${d.day}` }))}
                  value={String(mandalAttendanceDay)}
                  onChange={(v) => setMandalAttendanceDay(Number(v))}
                />
              </div>
              <BarChart data={mandalAttendanceData} orientation="vertical" height={180} />
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
