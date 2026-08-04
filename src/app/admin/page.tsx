"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Users, ScanLine, ShieldCheck, ClipboardList } from "lucide-react";
import { useSession } from "@/lib/session";
import { canManagePeople } from "@/lib/admin";
import { GlassCard, staggerContainer, staggerItem } from "@/components/ui/GlassCard";

export default function AdminDashboardPage() {
  const { user } = useSession();

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-1 flex items-center gap-2">
          <ShieldCheck className="text-saffron-deep" size={22} />
          <h1 className="font-display text-2xl font-semibold">Admin</h1>
        </div>
        <p className="text-sm text-foreground-muted">
          Signed in as {user?.name} ({user?.role?.replace("_", " ")})
        </p>
      </div>

      <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-3">
        {canManagePeople(user?.role) && (
          <Link href="/admin/people">
            <GlassCard interactive variants={staggerItem} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-saffron-deep/12">
                  <Users className="text-saffron-deep" size={18} />
                </div>
                <div>
                  <p className="font-display text-sm font-semibold">People</p>
                  <p className="text-xs text-foreground-muted">
                    Mandal directory, seva assignment, admin roles
                  </p>
                </div>
              </div>
            </GlassCard>
          </Link>
        )}

        <Link href="/admin/scan">
          <GlassCard interactive variants={staggerItem} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-saffron-deep/12">
                <ScanLine className="text-saffron-deep" size={18} />
              </div>
              <div>
                <p className="font-display text-sm font-semibold">Scan Attendance</p>
                <p className="text-xs text-foreground-muted">Scan an attendee&apos;s QR code</p>
              </div>
            </div>
          </GlassCard>
        </Link>

        <Link href="/admin/log">
          <GlassCard interactive variants={staggerItem} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-saffron-deep/12">
                <ClipboardList className="text-saffron-deep" size={18} />
              </div>
              <div>
                <p className="font-display text-sm font-semibold">Attendance Log</p>
                <p className="text-xs text-foreground-muted">Live list of everyone checked in</p>
              </div>
            </div>
          </GlassCard>
        </Link>
      </motion.div>
    </div>
  );
}
