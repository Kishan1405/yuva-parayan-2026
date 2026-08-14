"use client";

import { useState } from "react";
import { searchMandalOptions } from "@/lib/api/mandals";
import type { Mandal } from "@/lib/api/types";
import { useSession } from "@/lib/session";
import { Label, Input } from "@/components/ui/Field";
import { SearchSelect } from "@/components/ui/SearchSelect";
import { Button } from "@/components/ui/Button";

export function SignupForm() {
  const { signUp } = useSession();
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [mandal, setMandal] = useState<Mandal | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    if (!mandal) {
      setError("Please select your Mandal.");
      return;
    }

    setSubmitting(true);
    const { error: signUpError } = await signUp({
      name,
      contact_number: contact.trim(),
      mandal_id: mandal.id,
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
        <SearchSelect
          value={mandal}
          onChange={setMandal}
          onSearch={searchMandalOptions}
          getId={(m) => m.id}
          getLabel={(m) => m.name}
          placeholder="Search for your Mandal…"
        />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
