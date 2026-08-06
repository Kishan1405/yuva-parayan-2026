"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { X, type LucideIcon } from "lucide-react";
import { EVENT_NAME } from "@/lib/event";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

// Fixed hamburger-triggered sidebar, shared by every breakpoint — the
// desktop top nav used to list every item in a row and ran out of room as
// admin-only tabs were added; the sidebar has no such ceiling.
export function Sidebar({
  open,
  onClose,
  navItems,
  pathname,
}: {
  open: boolean;
  onClose: () => void;
  navItems: NavItem[];
  pathname: string;
}) {
  function isActive(href: string) {
    return href === "/" ? pathname === "/" : pathname.startsWith(href);
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/40"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
            className="glass-nav fixed inset-y-0 left-0 flex w-[78%] max-w-xs flex-col rounded-r-3xl p-4"
          >
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Image src="/logo.png" alt="" width={28} height={34} className="rounded-md" />
                <span className="font-display text-base font-semibold text-gradient-saffron">
                  {EVENT_NAME}
                </span>
              </div>
              <button
                onClick={onClose}
                aria-label="Close menu"
                className="flex h-9 w-9 items-center justify-center rounded-full text-foreground-muted"
              >
                <X size={20} />
              </button>
            </div>

            <nav className="flex flex-col gap-1">
              {navItems.map(({ href, label, icon: Icon }) => {
                const active = isActive(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={onClose}
                    className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition-colors ${
                      active
                        ? "bg-gradient-to-br from-saffron to-saffron-deep text-white"
                        : "text-foreground-muted hover:bg-saffron-deep/10 hover:text-foreground"
                    }`}
                  >
                    <Icon size={19} strokeWidth={active ? 2.4 : 2} />
                    {label}
                  </Link>
                );
              })}
            </nav>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
