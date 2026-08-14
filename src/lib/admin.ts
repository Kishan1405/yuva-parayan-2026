import type { UserRole } from "./api/types";

export const ADMIN_ROLES: UserRole[] = ["admin", "super_admin"];
export const SCAN_ROLES: UserRole[] = ["admin", "super_admin", "scanner"];

export function canManagePeople(role: UserRole | undefined): boolean {
  return !!role && ADMIN_ROLES.includes(role);
}

export function canScan(role: UserRole | undefined): boolean {
  return !!role && SCAN_ROLES.includes(role);
}

export function canManageAdmins(role: UserRole | undefined): boolean {
  return role === "super_admin";
}
