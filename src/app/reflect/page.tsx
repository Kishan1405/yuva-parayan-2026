"use client";

import { useState } from "react";
import { FeedbackSection } from "./FeedbackSection";
import { WallSection } from "./WallSection";

const TABS = [
  { key: "feedback", label: "Day Feedback" },
  { key: "wall", label: "Memory Wall" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function ReflectPage() {
  const [tab, setTab] = useState<TabKey>("feedback");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Reflect</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Share your feedback and the memories you&apos;re taking home.
        </p>
      </div>

      <div className="glass-card flex gap-1 rounded-2xl p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
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

      {tab === "feedback" ? <FeedbackSection /> : <WallSection />}
    </div>
  );
}
