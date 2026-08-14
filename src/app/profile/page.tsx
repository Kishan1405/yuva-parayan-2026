"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, Pencil, Users } from "lucide-react";
import { useSession } from "@/lib/session";
import { getMandalById, searchMandalOptions } from "@/lib/api/mandals";
import { listDepartments } from "@/lib/api/departments";
import { GlassCard } from "@/components/ui/GlassCard";
import { Label, Input } from "@/components/ui/Field";
import { SearchSelect } from "@/components/ui/SearchSelect";
import { Button } from "@/components/ui/Button";
import type { Department, Mandal } from "@/lib/api/types";

export default function ProfilePage() {
  const { user, updateProfile, forgetDevice } = useSession();
  const [currentMandal, setCurrentMandal] = useState<Mandal | null>(null);
  const [department, setDepartment] = useState<Department | null>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name ?? "");
  const [contact, setContact] = useState(user?.contact_number ?? "");
  const [editMandal, setEditMandal] = useState<Mandal | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.mandal_id) {
      getMandalById(user.mandal_id).then(({ data }) => setCurrentMandal(data));
    } else {
      setCurrentMandal(null);
    }
  }, [user?.mandal_id]);

  useEffect(() => {
    if (!user?.department_id) {
      setDepartment(null);
      return;
    }
    const departmentId = user.department_id;
    listDepartments().then(({ data }) => {
      setDepartment(data?.find((d) => d.id === departmentId) ?? null);
    });
  }, [user?.department_id]);

  if (!user) return null;

  function startEditing() {
    setName(user!.name);
    setContact(user!.contact_number);
    setEditMandal(currentMandal);
    setError(null);
    setEditing(true);
  }

  async function handleSave() {
    setError(null);
    if (name.trim().length < 2) {
      setError("Please enter your full name.");
      return;
    }
    if (!/^\d{10}$/.test(contact.trim())) {
      setError("Please enter a valid 10-digit contact number.");
      return;
    }
    if (!editMandal) {
      setError("Please select your Mandal.");
      return;
    }
    setSaving(true);
    const { error: saveError } = await updateProfile({
      name: name.trim(),
      contact_number: contact.trim(),
      mandal_id: editMandal.id,
    });
    setSaving(false);
    if (saveError) setError(saveError);
    else setEditing(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Profile</h1>
        <p className="mt-1 text-sm text-foreground-muted">View and edit your details.</p>
      </div>

      <GlassCard strong className="flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-saffron to-saffron-deep text-2xl font-semibold text-white">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="font-display text-lg font-semibold">{user.name}</p>
          <p className="text-sm text-foreground-muted">{user.contact_number}</p>
        </div>
      </GlassCard>

      <AnimatePresence mode="wait" initial={false}>
        {!editing ? (
          <motion.div
            key="view"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="space-y-4"
          >
            <GlassCard className="space-y-4">
              <Row label="Mandal" value={currentMandal?.name ?? "—"} />
              <Row
                label="Department"
                value={department?.name ?? "Not yet assigned"}
                icon={<Users size={15} className="text-foreground-muted" />}
              />
            </GlassCard>

            <Button variant="ghost" onClick={startEditing} className="w-full">
              <Pencil size={16} />
              Edit details
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key="edit"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            <GlassCard strong className="space-y-4">
              <div>
                <Label>Full name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <Label>Contact number</Label>
                <Input
                  value={contact}
                  onChange={(e) => setContact(e.target.value.replace(/[^\d]/g, "").slice(0, 10))}
                  inputMode="numeric"
                />
              </div>
              <div>
                <Label>Mandal</Label>
                <SearchSelect
                  value={editMandal}
                  onChange={setEditMandal}
                  onSearch={searchMandalOptions}
                  getId={(m) => m.id}
                  getLabel={(m) => m.name}
                  placeholder="Search for your Mandal…"
                />
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}

              <div className="flex gap-3">
                <Button variant="ghost" className="flex-1" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
                <Button className="flex-1" disabled={saving} onClick={handleSave}>
                  {saving ? "Saving…" : "Save"}
                </Button>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => {
          if (confirm("Remove your account from this device? You'll need to sign up again.")) {
            forgetDevice();
          }
        }}
        className="flex w-full items-center justify-center gap-2 py-3 text-sm font-medium text-foreground-muted"
      >
        <LogOut size={15} />
        Remove account from this device
      </button>
    </div>
  );
}

function Row({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-foreground-muted">{label}</span>
      <span className="flex items-center gap-1.5 text-sm font-medium">
        {icon}
        {value}
      </span>
    </div>
  );
}
