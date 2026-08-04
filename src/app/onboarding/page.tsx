"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { EVENT_NAME } from "@/lib/event";
import { GlassCard } from "@/components/ui/GlassCard";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { LoginForm } from "./LoginForm";
import { SignupForm } from "./SignupForm";

const TABS = [
  { value: "login", label: "Log in" },
  { value: "signup", label: "Create account" },
] as const;

type TabKey = (typeof TABS)[number]["value"];

export default function OnboardingPage() {
  const [tab, setTab] = useState<TabKey>("login");

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm"
      >
        <div className="mb-8 text-center">
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.1 }}
            className="mx-auto mb-4 flex h-20 w-[66px] items-center justify-center overflow-hidden rounded-2xl shadow-lg shadow-saffron-deep/20"
          >
            <Image src="/logo.png" alt="BAPS Swaminarayan" width={132} height={162} priority />
          </motion.div>
          <h1 className="font-display text-2xl font-semibold text-gradient-saffron">
            {EVENT_NAME}
          </h1>
          <p className="mt-1 text-sm text-foreground-muted">6–8 August 2026</p>
        </div>

        <div className="mb-4">
          <SegmentedControl options={[...TABS]} value={tab} onChange={setTab} />
        </div>

        <GlassCard strong>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={tab}
              initial={{ opacity: 0, x: tab === "login" ? -12 : 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: tab === "login" ? 12 : -12 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              {tab === "login" ? (
                <>
                  <h2 className="mb-1 font-display text-lg font-semibold">Welcome back</h2>
                  <p className="mb-5 text-sm text-foreground-muted">
                    Log in to the same account on this device.
                  </p>
                  <LoginForm />
                </>
              ) : (
                <>
                  <h2 className="mb-1 font-display text-lg font-semibold">Welcome</h2>
                  <p className="mb-5 text-sm text-foreground-muted">
                    Create your account to get started.
                  </p>
                  <SignupForm />
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </GlassCard>

        <p className="mt-6 text-center text-xs text-foreground-muted">
          No password to remember — your PIN defaults to the last 4 digits of
          your contact number.
        </p>
      </motion.div>
    </div>
  );
}
