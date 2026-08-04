"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { EVENT_NAME } from "@/lib/event";
import { GlassCard } from "@/components/ui/GlassCard";
import { LoginForm } from "./LoginForm";
import { SignupForm } from "./SignupForm";

const TABS = [
  { key: "login", label: "Log in" },
  { key: "signup", label: "Create account" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function OnboardingPage() {
  const [tab, setTab] = useState<TabKey>("login");

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-saffron to-saffron-deep shadow-lg shadow-saffron-deep/30">
            <Sparkles className="text-white" size={26} />
          </div>
          <h1 className="font-display text-2xl font-semibold text-gradient-saffron">
            {EVENT_NAME}
          </h1>
          <p className="mt-1 text-sm text-foreground-muted">6–8 August 2026</p>
        </div>

        <div className="glass-card mb-4 flex gap-1 rounded-2xl p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition ${
                tab === t.key
                  ? "bg-gradient-to-br from-saffron to-saffron-deep text-white shadow-md shadow-saffron-deep/20"
                  : "text-foreground-muted"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <GlassCard strong>
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
        </GlassCard>

        <p className="mt-6 text-center text-xs text-foreground-muted">
          No password to remember — your PIN defaults to the last 4 digits of
          your contact number.
        </p>
      </div>
    </div>
  );
}
