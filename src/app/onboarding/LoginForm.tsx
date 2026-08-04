"use client";

import { useState } from "react";
import { useSession } from "@/lib/session";
import { Label, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

export function LoginForm() {
  const { login } = useSession();
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [pin, setPin] = useState("");
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
    if (!/^\d{4,6}$/.test(pin.trim())) {
      setError("PIN must be 4 to 6 digits.");
      return;
    }

    setSubmitting(true);
    const { error: loginError } = await login({
      name,
      contact_number: contact.trim(),
      pin: pin.trim(),
    });
    setSubmitting(false);
    if (loginError) setError(loginError);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Full name</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Same name you signed up with"
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
        <Label>PIN</Label>
        <Input
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/[^\d]/g, "").slice(0, 6))}
          placeholder="Last 4 digits of your number, by default"
          inputMode="numeric"
          type="password"
          autoComplete="off"
        />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? "Logging in…" : "Log in"}
      </Button>
    </form>
  );
}
