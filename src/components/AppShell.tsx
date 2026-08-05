"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
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
} from "lucide-react";
import { EVENT_NAME } from "@/lib/event";
import { useSession } from "@/lib/session";
import { canManagePeople, canScan } from "@/lib/admin";
import { PageTransition } from "@/components/PageTransition";
import { MobileSidebar } from "@/components/MobileSidebar";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/memories", label: "Memories", icon: Images },
  { href: "/departments", label: "Departments", icon: Users, adminOnly: true },
  { href: "/people", label: "People", icon: Contact, adminOnly: true },
  { href: "/scan", label: "Scan", icon: ScanLine, scanOnly: true },
  { href: "/reflect", label: "Reflect", icon: HeartHandshake },
  { href: "/profile", label: "Profile", icon: UserRound },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

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
      {/* Desktop top nav */}
      <header className="sticky top-0 z-40 hidden md:block">
        <div className="glass-nav mx-auto mt-4 flex w-full max-w-4xl items-center justify-between rounded-2xl px-6 py-3">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="" width={30} height={37} className="rounded-md" />
            <span className="font-display text-lg font-semibold text-gradient-saffron">
              {EVENT_NAME}
            </span>
          </Link>
          <nav className="flex items-center gap-1">
            {navItems.map(({ href, label, icon: Icon }) => {
              const active = isActive(pathname, href);
              return (
                <Link key={href} href={href} className="relative px-1 py-1">
                  {active && (
                    <motion.span
                      layoutId="desktop-nav-pill"
                      className="absolute inset-0 rounded-xl bg-saffron-deep/15"
                      transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    />
                  )}
                  <span
                    className={`relative z-10 flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                      active ? "text-saffron-deep" : "text-foreground-muted hover:text-foreground"
                    }`}
                  >
                    <Icon size={18} strokeWidth={2} />
                    {label}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Mobile top bar: hamburger left, greeting right */}
      <header className="sticky top-0 z-40 px-3 pt-3 md:hidden">
        <div className="glass-nav flex items-center justify-between rounded-2xl px-3 py-2.5">
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
            className="flex h-9 w-9 items-center justify-center rounded-full text-foreground"
          >
            <Menu size={22} />
          </button>

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

      <MobileSidebar
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
