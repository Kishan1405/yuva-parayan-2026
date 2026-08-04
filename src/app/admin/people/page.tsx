"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ChevronDown, Search, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/session";
import { searchPeople, assignDepartment, setUserRole, canManageAdmins } from "@/lib/admin";
import { GlassCard, staggerContainer, staggerItem } from "@/components/ui/GlassCard";
import { Input, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import type { AdminPerson, Department, Mandal, MemberRole, UserRole } from "@/lib/database.types";
import Link from "next/link";

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "user", label: "User" },
  { value: "scanner", label: "Scanner" },
  { value: "admin", label: "Admin" },
  { value: "super_admin", label: "Super Admin" },
];

export default function AdminPeoplePage() {
  const { user, deviceToken } = useSession();
  const [mandals, setMandals] = useState<Mandal[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [query, setQuery] = useState("");
  const [people, setPeople] = useState<AdminPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("mandals")
      .select("*")
      .order("sort_order")
      .then(({ data }) => setMandals(data ?? []));
    supabase
      .from("departments")
      .select("*")
      .order("sort_order")
      .then(({ data }) => setDepartments(data ?? []));
  }, []);

  const load = useMemo(
    () => async (q: string) => {
      if (!deviceToken) return;
      setLoading(true);
      const { data } = await searchPeople(deviceToken, q);
      setPeople(data);
      setLoading(false);
    },
    [deviceToken]
  );

  useEffect(() => {
    const t = setTimeout(() => load(query), 250);
    return () => clearTimeout(t);
  }, [query, load]);

  const mandalName = (id: string | null) => mandals.find((m) => m.id === id)?.name ?? "No Mandal";

  const grouped = useMemo(() => {
    const map = new Map<string, AdminPerson[]>();
    for (const person of people) {
      const key = mandalName(person.mandal_id);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(person);
    }
    return Array.from(map.entries());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [people, mandals]);

  async function handleAssignDepartment(
    personId: string,
    departmentId: string | null,
    departmentRole: MemberRole
  ) {
    if (!deviceToken) return;
    const { data, error } = await assignDepartment(deviceToken, personId, departmentId, departmentRole);
    if (data) {
      setPeople((prev) => prev.map((p) => (p.id === personId ? data : p)));
    }
    if (error) alert(error);
  }

  async function handleSetRole(personId: string, role: UserRole) {
    if (!deviceToken) return;
    if (!confirm(`Set this person's role to "${role.replace("_", " ")}"?`)) return;
    const { data, error } = await setUserRole(deviceToken, personId, role);
    if (data) {
      setPeople((prev) => prev.map((p) => (p.id === personId ? data : p)));
    }
    if (error) alert(error);
  }

  return (
    <div className="space-y-6">
      <Link href="/admin" className="flex items-center gap-1.5 text-sm font-medium text-foreground-muted">
        <ArrowLeft size={16} />
        Admin
      </Link>

      <div>
        <h1 className="font-display text-2xl font-semibold">People</h1>
        <p className="mt-1 text-sm text-foreground-muted">{people.length} people</p>
      </div>

      <div className="relative">
        <Search
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-foreground-muted"
          size={16}
        />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name…"
          className="pl-10"
        />
      </div>

      {loading && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="glass-card h-16 animate-pulse rounded-3xl" />
          ))}
        </div>
      )}

      {!loading &&
        grouped.map(([mandal, list]) => (
          <div key={mandal}>
            <h2 className="mb-3 font-display text-base font-semibold">{mandal}</h2>
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="show"
              className="space-y-3"
            >
              {list.map((person) => (
                <motion.div key={person.id} variants={staggerItem}>
                  <PersonRow
                    person={person}
                    departments={departments}
                    isOpen={openId === person.id}
                    onToggle={() => setOpenId(openId === person.id ? null : person.id)}
                    onAssignDepartment={handleAssignDepartment}
                    onSetRole={handleSetRole}
                    canManageAdmins={canManageAdmins(user?.role)}
                    isSelf={person.id === user?.id}
                  />
                </motion.div>
              ))}
            </motion.div>
          </div>
        ))}

      {!loading && people.length === 0 && (
        <p className="py-8 text-center text-sm text-foreground-muted">No one found.</p>
      )}
    </div>
  );
}

function PersonRow({
  person,
  departments,
  isOpen,
  onToggle,
  onAssignDepartment,
  onSetRole,
  canManageAdmins,
  isSelf,
}: {
  person: AdminPerson;
  departments: Department[];
  isOpen: boolean;
  onToggle: () => void;
  onAssignDepartment: (id: string, departmentId: string | null, role: MemberRole) => void;
  onSetRole: (id: string, role: UserRole) => void;
  canManageAdmins: boolean;
  isSelf: boolean;
}) {
  const [deptId, setDeptId] = useState(person.department_id ?? "");
  const [deptRole, setDeptRole] = useState<MemberRole>(person.department_role);
  const pillId = useId();

  useEffect(() => {
    setDeptId(person.department_id ?? "");
    setDeptRole(person.department_role);
  }, [person.department_id, person.department_role]);

  return (
    <div>
      <GlassCard
        interactive
        onClick={onToggle}
        className="flex cursor-pointer items-center justify-between py-3.5"
      >
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold">{person.name}</p>
            {person.role !== "user" && (
              <span className="flex items-center gap-1 rounded-full bg-saffron-deep/15 px-2 py-0.5 text-[10px] font-semibold text-saffron-deep">
                <ShieldCheck size={11} />
                {person.role.replace("_", " ")}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-foreground-muted">
            {person.contact_number}
            {person.department_id && (
              <> · {departments.find((d) => d.id === person.department_id)?.name ?? "Department"}</>
            )}
          </p>
        </div>
        <ChevronDown
          size={18}
          className={`shrink-0 text-foreground-muted transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </GlassCard>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <GlassCard strong className="mt-2 space-y-4">
              <div>
                <p className="mb-1.5 text-xs font-medium text-foreground-muted">Department</p>
                <Select value={deptId} onChange={(e) => setDeptId(e.target.value)}>
                  <option value="">No department</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </Select>
              </div>

              {deptId && (
                <div>
                  <p className="mb-1.5 text-xs font-medium text-foreground-muted">Seva role</p>
                  <Select
                    value={deptRole}
                    onChange={(e) => setDeptRole(e.target.value as MemberRole)}
                  >
                    <option value="member">Member</option>
                    <option value="in-charge">In-charge</option>
                  </Select>
                </div>
              )}

              <Button
                type="button"
                className="w-full"
                onClick={() => onAssignDepartment(person.id, deptId || null, deptRole)}
              >
                Save department
              </Button>

              {canManageAdmins && (
                <div className="border-t border-foreground/10 pt-4">
                  <p className="mb-2 text-xs font-medium text-foreground-muted">
                    Admin access {isSelf && "(you)"}
                  </p>
                  <div className="glass-card flex gap-1 rounded-2xl p-1">
                    {ROLE_OPTIONS.map((opt) => {
                      const active = person.role === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          disabled={isSelf}
                          onClick={() => onSetRole(person.id, opt.value)}
                          className="relative flex-1 rounded-xl py-2 text-[11px] font-semibold disabled:opacity-40"
                        >
                          {active && (
                            <motion.span
                              layoutId={`${pillId}-role-pill`}
                              className="absolute inset-0 rounded-xl bg-gradient-to-br from-saffron to-saffron-deep"
                              transition={{ type: "spring", stiffness: 500, damping: 35 }}
                            />
                          )}
                          <span
                            className={`relative z-10 ${active ? "text-white" : "text-foreground-muted"}`}
                          >
                            {opt.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
