"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/session";
import { EVENT_NAME } from "@/lib/event";
import { GlassCard } from "@/components/ui/GlassCard";
import { Label, Input, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import type { Mandal } from "@/lib/database.types";

export default function OnboardingPage() {
  const { signUp } = useSession();
  const [mandals, setMandals] = useState<Mandal[]>([]);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [mandalId, setMandalId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("mandals")
      .select("*")
      .order("sort_order")
      .then(({ data }) => {
        if (data) {
          setMandals(data);
          if (data.length > 0) setMandalId((prev) => prev || data[0].id);
        }
      });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (name.trim().length < 2) {
      setError("Please enter your full name.");
      return;
    }
    if (!/^\d{10}$/.test(contact.trim())) {
      setError("Please enter a valid 10-digit contact number.");
      return;
    }
    if (!mandalId) {
      setError("Please select your Mandal.");
      return;
    }

    setSubmitting(true);
    const { error: signUpError } = await signUp({
      name,
      contact_number: contact.trim(),
      mandal_id: mandalId,
    });
    setSubmitting(false);
    if (signUpError) setError(signUpError);
  }

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
          <p className="mt-1 text-sm text-foreground-muted">7–9 August 2026</p>
        </div>

        <GlassCard strong>
          <h2 className="mb-1 font-display text-lg font-semibold">Welcome</h2>
          <p className="mb-5 text-sm text-foreground-muted">
            Create your account to get started.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Full name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Kishan Viradiya"
                autoComplete="name"
              />
            </div>

            <div>
              <Label>Contact number</Label>
              <Input
                value={contact}
                onChange={(e) => setContact(e.target.value.replace(/[^\d]/g, "").slice(0, 10))}
                placeholder="10-digit mobile number"
                inputMode="numeric"
                autoComplete="tel"
              />
            </div>

            <div>
              <Label>Mandal</Label>
              <Select value={mandalId} onChange={(e) => setMandalId(e.target.value)}>
                {mandals.length === 0 && <option value="">Loading Mandals…</option>}
                {mandals.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </Select>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "Creating account…" : "Continue"}
            </Button>
          </form>
        </GlassCard>

        <p className="mt-6 text-center text-xs text-foreground-muted">
          Your account stays on this device — no password needed.
        </p>
      </div>
    </div>
  );
}
