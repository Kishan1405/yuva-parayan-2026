"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Search, ShieldCheck, UserX, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/session";
import {
  searchPeople,
  assignDepartment,
  setUserRole,
  deletePerson,
  canManageAdmins,
} from "@/lib/admin";
import { GlassCard, staggerContainer, staggerItem } from "@/components/ui/GlassCard";
import { Input, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import type { AdminPerson, Department, Mandal, MemberRole, UserRole } from "@/lib/database.types";

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "user", label: "User" },
  { value: "scanner", label: "Scanner" },
  { value: "admin", label: "Admin" },
  { value: "super_admin", label: "Super Admin" },
];

export default function PeoplePage() {
  const { user, deviceToken } = useSession();
  const [mandals, setMandals] = useState<Mandal[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [query, setQuery] = useState("");
  const [people, setPeople] = useState<AdminPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all"); // "all" | "none" | department id
  const [mandalFilter, setMandalFilter] = useState<string>("all"); // "all" | "none" | mandal id

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

  const filtersActive = roleFilter !== "all" || departmentFilter !== "all" || mandalFilter !== "all";

  const filteredPeople = useMemo(() => {
    return people.filter((p) => {
      if (roleFilter !== "all" && p.role !== roleFilter) return false;
      if (departmentFilter === "none" && p.department_id) return false;
      if (
        departmentFilter !== "all" &&
        departmentFilter !== "none" &&
        p.department_id !== departmentFilter
      )
        return false;
      if (mandalFilter === "none" && p.mandal_id) return false;
      if (mandalFilter !== "all" && mandalFilter !== "none" && p.mandal_id !== mandalFilter)
        return false;
      return true;
    });
  }, [people, roleFilter, departmentFilter, mandalFilter]);

  const grouped = useMemo(() => {
    const map = new Map<string, AdminPerson[]>();
    for (const person of filteredPeople) {
      const key = mandalName(person.mandal_id);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(person);
    }
    return Array.from(map.entries());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredPeople, mandals]);

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

  async function handleDeletePerson(person: AdminPerson) {
    if (!deviceToken) return;
    if (
      !confirm(
        `Permanently remove ${person.name}'s account? This deletes their attendance and feedback too, and can't be undone.`
      )
    )
      return;

    const { error } = await deletePerson(deviceToken, person.id);
    if (error) {
      alert(error);
      return;
    }
    setPeople((prev) => prev.filter((p) => p.id !== person.id));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Users className="text-saffron-deep" size={22} />
        <h1 className="font-display text-2xl font-semibold">People</h1>
      </div>
      <p className="-mt-4 text-sm text-foreground-muted">
        {filteredPeople.length} {filtersActive && `of ${people.length}`} people
      </p>

      <div className="relative">
        <Search
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-foreground-muted"
          size={16}
        />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or contact number…"
          className="pl-10"
          autoFocus
        />
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as UserRole | "all")}>
          <option value="all">All roles</option>
          {ROLE_OPTIONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </Select>

        <Select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)}>
          <option value="all">All departments</option>
          <option value="none">No department</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </Select>

        <Select value={mandalFilter} onChange={(e) => setMandalFilter(e.target.value)}>
          <option value="all">All Mandals</option>
          <option value="none">No Mandal</option>
          {mandals.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </Select>
      </div>

      {filtersActive && (
        <button
          type="button"
          onClick={() => {
            setRoleFilter("all");
            setDepartmentFilter("all");
            setMandalFilter("all");
          }}
          className="-mt-4 text-xs font-medium text-saffron-deep"
        >
          Clear filters
        </button>
      )}

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
            <div className="mb-3 flex items-center gap-2">
              <h2 className="font-display text-base font-semibold">{mandal}</h2>
              <span className="rounded-full bg-saffron-deep/12 px-2 py-0.5 text-[11px] font-semibold text-saffron-deep">
                {list.length}
              </span>
            </div>
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
                    mandalLabel={mandalName(person.mandal_id)}
                    departments={departments}
                    isOpen={openId === person.id}
                    onToggle={() => setOpenId(openId === person.id ? null : person.id)}
                    onAssignDepartment={handleAssignDepartment}
                    onSetRole={handleSetRole}
                    onDelete={handleDeletePerson}
                    canManageAdmins={canManageAdmins(user?.role)}
                    isSelf={person.id === user?.id}
                  />
                </motion.div>
              ))}
            </motion.div>
          </div>
        ))}

      {!loading && filteredPeople.length === 0 && (
        <p className="py-8 text-center text-sm text-foreground-muted">No one found.</p>
      )}
    </div>
  );
}

function PersonRow({
  person,
  mandalLabel,
  departments,
  isOpen,
  onToggle,
  onAssignDepartment,
  onSetRole,
  onDelete,
  canManageAdmins,
  isSelf,
}: {
  person: AdminPerson;
  mandalLabel: string;
  departments: Department[];
  isOpen: boolean;
  onToggle: () => void;
  onAssignDepartment: (id: string, departmentId: string | null, role: MemberRole) => void;
  onSetRole: (id: string, role: UserRole) => void;
  onDelete: (person: AdminPerson) => void;
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
            {person.contact_number} · {mandalLabel}
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

              <div className="border-t border-foreground/10 pt-4">
                <button
                  type="button"
                  disabled={isSelf}
                  onClick={() => onDelete(person)}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-500/10 py-2.5 text-sm font-semibold text-red-500 disabled:opacity-40"
                >
                  <UserX size={16} />
                  {isSelf ? "Can't remove your own account" : "Remove this person"}
                </button>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
