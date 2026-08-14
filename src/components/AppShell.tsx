"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Home,
  Images,
  Users,
  HeartHandshake,
  UserRound,
  ScanLine,
  Contact,
  Menu,
  ShieldCheck,
  BarChart3,
} from "lucide-react";
import { EVENT_NAME } from "@/lib/event";
import { useSession } from "@/lib/session";
import { canManagePeople, canScan } from "@/lib/admin";
import { PageTransition } from "@/components/PageTransition";
import { Sidebar } from "@/components/Sidebar";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/memories", label: "Memories", icon: Images },
  { href: "/departments", label: "Departments", icon: Users, adminOnly: true },
  { href: "/people", label: "People", icon: Contact, adminOnly: true },
  { href: "/analytics", label: "Analytics", icon: BarChart3, adminOnly: true },
  { href: "/scan", label: "Scan", icon: ScanLine, scanOnly: true },
  { href: "/reflect", label: "Reflect", icon: HeartHandshake },
  { href: "/profile", label: "Profile", icon: UserRound },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navItems = NAV_ITEMS.filter((item) => {
    if (item.adminOnly && !canManagePeople(user?.role)) return false;
    if (item.scanOnly && !canScan(user?.role)) return false;
    return true;
  });
  const firstName = user?.name.trim().split(" ")[0] ?? "";

  return (
    <div className="flex min-h-screen flex-col">
      {/* One hamburger-triggered top bar at every breakpoint — the old
          desktop row of nav links ran out of room as admin-only tabs were
          added, so navigation now always lives in the Sidebar instead. */}
      <header className="sticky top-0 z-40 px-3 pt-3 md:mx-auto md:mt-4 md:w-full md:max-w-4xl md:px-0">
        <div className="glass-nav flex items-center justify-between rounded-2xl px-3 py-2.5 md:px-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
              className="flex h-9 w-9 items-center justify-center rounded-full text-foreground"
            >
              <Menu size={22} />
            </button>
            <Link href="/" className="hidden items-center gap-2.5 md:flex">
              <Image src="/logo.png" alt="" width={32} height={32} className="rounded-md" />
              <span className="font-display text-base font-semibold text-gradient-saffron">
                {EVENT_NAME}
              </span>
            </Link>
          </div>

          {user && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-foreground-muted">
                Jai Swaminarayan, <span className="font-semibold text-foreground">{firstName}</span>
              </span>
              <span
                className={`flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ${
                  user.role === "user"
                    ? "bg-foreground/5 text-foreground-muted"
                    : "bg-saffron-deep/15 text-saffron-deep"
                }`}
              >
                {user.role !== "user" && <ShieldCheck size={10} />}
                {user.role.replace("_", " ")}
              </span>
            </div>
          )}
        </div>
      </header>

      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        navItems={navItems}
        pathname={pathname}
      />

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-4 md:px-6 md:pb-12 md:pt-8">
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  );
}
