import { apiFetch, USE_MOCK } from "./client";
import {
  mockDeleteAttendance,
  mockGetMyAttendance,
  mockListAttendanceLogs,
  mockMarkAttendance,
  mockRegisterPerson,
  mockSearchPeople,
} from "./mockAdapter";
import type {
  ApiResult,
  Attendance,
  AttendanceLogEntry,
  AttendanceMarkResult,
  Paginated,
  ScanPerson,
  User,
} from "./types";

export async function getMyAttendance(token: string): Promise<ApiResult<Attendance[]>> {
  if (USE_MOCK) return mockGetMyAttendance(token);

  const { body, error } = await apiFetch<{ data: Attendance[] }>("/attendance/me", { token });
  if (error || !body) return { data: null, error: error ?? "Something went wrong. Please try again." };
  return { data: body.data, error: null };
}

export async function markAttendance(
  token: string,
  targetUserId: string,
  eventId: string
): Promise<ApiResult<AttendanceMarkResult>> {
  if (USE_MOCK) return mockMarkAttendance(token, targetUserId, eventId);

  const { body, error } = await apiFetch<{ data: AttendanceMarkResult }>("/attendance/mark", {
    method: "POST",
    token,
    body: { user_id: targetUserId, event_id: eventId },
  });
  if (error || !body) return { data: null, error: error ?? "Something went wrong. Please try again." };
  return { data: body.data, error: null };
}

export async function listAttendanceLogs(
  token: string,
  query: { event_id?: string; mandal_id?: string; page?: number; per_page?: number }
): Promise<ApiResult<Paginated<AttendanceLogEntry>>> {
  if (USE_MOCK) return mockListAttendanceLogs(token, query);

  const { body, error } = await apiFetch<Paginated<AttendanceLogEntry>>("/attendance/logs", {
    token,
    query,
  });
  if (error || !body) return { data: null, error: error ?? "Something went wrong. Please try again." };
  return { data: body, error: null };
}

export async function deleteAttendance(token: string, attendanceId: string): Promise<ApiResult<null>> {
  if (USE_MOCK) return mockDeleteAttendance(token, attendanceId);

  const { error } = await apiFetch<null>(`/attendance/logs/${attendanceId}`, {
    method: "DELETE",
    token,
  });
  if (error) return { data: null, error };
  return { data: null, error: null };
}

export async function searchPeople(token: string, query: string): Promise<ApiResult<ScanPerson[]>> {
  if (USE_MOCK) return mockSearchPeople(token, query);

  const { body, error } = await apiFetch<{ data: ScanPerson[] }>("/people/search", {
    token,
    query: { query },
  });
  if (error || !body) return { data: null, error: error ?? "Something went wrong. Please try again." };
  return { data: body.data, error: null };
}

export async function registerPerson(
  token: string,
  input: { name: string; contact_number: string; mandal_id: string }
): Promise<ApiResult<User>> {
  if (USE_MOCK) return mockRegisterPerson(token, input);

  const { body, error } = await apiFetch<{ data: User }>("/people/register", {
    method: "POST",
    token,
    body: input,
  });
  if (error || !body) return { data: null, error: error ?? "Something went wrong. Please try again." };
  return { data: body.data, error: null };
}
