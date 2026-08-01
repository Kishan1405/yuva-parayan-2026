"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Images, Users, HeartHandshake, UserRound } from "lucide-react";
import { EVENT_NAME } from "@/lib/event";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/memories", label: "Memories", icon: Images },
  { href: "/departments", label: "Departments", icon: Users },
  { href: "/reflect", label: "Reflect", icon: HeartHandshake },
  { href: "/profile", label: "Profile", icon: UserRound },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen flex-col">
      {/* Desktop top nav */}
      <header className="sticky top-0 z-40 hidden md:block">
        <div className="glass-nav mx-auto mt-4 flex w-full max-w-4xl items-center justify-between rounded-2xl px-6 py-3">
          <span className="font-display text-lg font-semibold text-gradient-saffron">
            {EVENT_NAME}
          </span>
          <nav className="flex items-center gap-1">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const active = isActive(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "bg-saffron-deep/15 text-saffron-deep"
                      : "text-foreground-muted hover:text-foreground"
                  }`}
                >
                  <Icon size={18} strokeWidth={2} />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 pt-6 pb-[calc(7rem+env(safe-area-inset-bottom))] md:px-6 md:pb-12 md:pt-8">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav className="glass-nav fixed inset-x-3 z-40 rounded-3xl px-2 py-2 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] md:hidden">
        <div className="flex items-center justify-between">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className="flex flex-1 flex-col items-center gap-1 rounded-2xl py-2 text-[11px] font-medium"
              >
                <Icon
                  size={22}
                  strokeWidth={active ? 2.4 : 2}
                  className={active ? "text-saffron-deep" : "text-foreground-muted"}
                />
                <span className={active ? "text-saffron-deep" : "text-foreground-muted"}>
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
