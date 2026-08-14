"use client";

import { useState } from "react";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { FeedbackSection } from "./FeedbackSection";
import { WallSection } from "./WallSection";

const TABS = [
  { value: "feedback", label: "Day Feedback" },
  { value: "wall", label: "Memory Wall" },
] as const;

type TabKey = (typeof TABS)[number]["value"];

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

      <SegmentedControl options={[...TABS]} value={tab} onChange={setTab} />

      {tab === "feedback" ? <FeedbackSection /> : <WallSection />}
    </div>
  );
}
