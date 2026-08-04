"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Home, Images, Users, HeartHandshake, UserRound, ScanLine } from "lucide-react";
import { EVENT_NAME } from "@/lib/event";
import { useSession } from "@/lib/session";
import { canManagePeople, canScan } from "@/lib/admin";
import { PageTransition } from "@/components/PageTransition";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/memories", label: "Memories", icon: Images },
  { href: "/departments", label: "Departments", icon: Users, adminOnly: true },
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
  const navItems = NAV_ITEMS.filter((item) => {
    if (item.adminOnly && !canManagePeople(user?.role)) return false;
    if (item.scanOnly && !canScan(user?.role)) return false;
    return true;
  });

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

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 pt-6 pb-[calc(7rem+env(safe-area-inset-bottom))] md:px-6 md:pb-12 md:pt-8">
        <PageTransition>{children}</PageTransition>
      </main>

      {/* Mobile bottom nav */}
      <nav className="glass-nav fixed inset-x-3 z-40 rounded-3xl px-2 py-2 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] md:hidden">
        <div className="flex items-center justify-between">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link key={href} href={href} className="relative flex flex-1 flex-col items-center">
                {active && (
                  <motion.span
                    layoutId="mobile-nav-pill"
                    className="absolute inset-x-1 inset-y-0 rounded-2xl bg-saffron-deep/10"
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  />
                )}
                <motion.span
                  className="relative z-10 flex flex-col items-center gap-1 py-2 text-[11px] font-medium"
                  animate={active ? { y: -1, scale: 1.06 } : { y: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 25 }}
                >
                  <Icon
                    size={22}
                    strokeWidth={active ? 2.4 : 2}
                    className={active ? "text-saffron-deep" : "text-foreground-muted"}
                  />
                  <span className={active ? "text-saffron-deep" : "text-foreground-muted"}>
                    {label}
                  </span>
                </motion.span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
