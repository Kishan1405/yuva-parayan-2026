"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/session";
import { Label, Input, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import type { Mandal } from "@/lib/database.types";

export function SignupForm() {
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
        {contact.length === 10 && (
          <p className="mt-1.5 text-xs text-foreground-muted">
            Your login PIN will be the last 4 digits of this number:{" "}
            <span className="font-semibold text-saffron-deep">{contact.slice(-4)}</span>
          </p>
        )}
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
        {submitting ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
