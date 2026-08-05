import { supabase } from "./supabase";
import type {
  AdminPerson,
  Attendance,
  AttendanceLogEntry,
  AttendanceMarkResult,
  MemberRole,
  ScanPerson,
  UserRole,
} from "./database.types";

function friendlyError(message: string | undefined): string {
  if (!message) return "Something went wrong. Please try again.";
  if (message.includes("Not authorized")) return "You don't have permission to do that.";
  return message;
}

export async function searchPeople(
  callerToken: string,
  query?: string
): Promise<{ data: AdminPerson[]; error: string | null }> {
  const { data, error } = await supabase.rpc("admin_search_people", {
    p_caller_token: callerToken,
    p_query: query || null,
  });
  if (error) return { data: [], error: friendlyError(error.message) };
  return { data: data ?? [], error: null };
}

export async function assignDepartment(
  callerToken: string,
  targetUserId: string,
  departmentId: string | null,
  departmentRole: MemberRole
): Promise<{ data: AdminPerson | null; error: string | null }> {
  const { data, error } = await supabase.rpc("admin_assign_department", {
    p_caller_token: callerToken,
    p_target_user_id: targetUserId,
    p_department_id: departmentId,
    p_department_role: departmentRole,
  });
  if (error) return { data: null, error: friendlyError(error.message) };
  return { data: data?.[0] ?? null, error: null };
}

export async function setUserRole(
  callerToken: string,
  targetUserId: string,
  role: UserRole
): Promise<{ data: AdminPerson | null; error: string | null }> {
  const { data, error } = await supabase.rpc("admin_set_role", {
    p_caller_token: callerToken,
    p_target_user_id: targetUserId,
    p_role: role,
  });
  if (error) return { data: null, error: friendlyError(error.message) };
  return { data: data?.[0] ?? null, error: null };
}

export async function markAttendance(
  callerToken: string,
  targetUserId: string,
  day: number
): Promise<{ data: AttendanceMarkResult | null; error: string | null }> {
  const { data, error } = await supabase.rpc("attendance_mark", {
    p_caller_token: callerToken,
    p_target_user_id: targetUserId,
    p_day: day,
  });
  if (error) return { data: null, error: friendlyError(error.message) };
  return { data: data?.[0] ?? null, error: null };
}

export async function scanSearchPeople(
  callerToken: string,
  query: string
): Promise<{ data: ScanPerson[]; error: string | null }> {
  const { data, error } = await supabase.rpc("scan_search_people", {
    p_caller_token: callerToken,
    p_query: query,
  });
  if (error) return { data: [], error: friendlyError(error.message) };
  return { data: data ?? [], error: null };
}

export async function getMyAttendance(
  deviceToken: string
): Promise<{ data: Attendance[]; error: string | null }> {
  const { data, error } = await supabase.rpc("get_my_attendance", {
    p_device_token: deviceToken,
  });
  if (error) return { data: [], error: friendlyError(error.message) };
  return { data: data ?? [], error: null };
}

export async function listAttendance(
  callerToken: string,
  day?: number
): Promise<{ data: AttendanceLogEntry[]; error: string | null }> {
  const { data, error } = await supabase.rpc("admin_list_attendance", {
    p_caller_token: callerToken,
    p_day: day ?? null,
  });
  if (error) return { data: [], error: friendlyError(error.message) };
  return { data: data ?? [], error: null };
}

export async function deleteAttendance(
  callerToken: string,
  attendanceId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc("admin_delete_attendance", {
    p_caller_token: callerToken,
    p_attendance_id: attendanceId,
  });
  if (error) return { error: friendlyError(error.message) };
  return { error: null };
}

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
