import { apiFetch, USE_MOCK } from "./client";
import {
  mockAssignDepartment,
  mockGetDepartment,
  mockGetDepartmentRoster,
  mockGetDepartmentTasks,
  mockListDepartments,
} from "./mockAdapter";
import type {
  ApiResult,
  Department,
  DepartmentRole,
  DepartmentRosterEntry,
  DepartmentTask,
} from "./types";

export async function listDepartments(): Promise<ApiResult<Department[]>> {
  if (USE_MOCK) return mockListDepartments();

  const { body, error } = await apiFetch<{ data: Department[] }>("/departments");
  if (error || !body) return { data: null, error: error ?? "Something went wrong. Please try again." };
  return { data: body.data, error: null };
}

export async function getDepartment(slug: string): Promise<ApiResult<Department | null>> {
  if (USE_MOCK) return mockGetDepartment(slug);

  const { body, error } = await apiFetch<{ data: Department | null }>(`/departments/${slug}`);
  if (error) return { data: null, error };
  return { data: body?.data ?? null, error: null };
}

export async function getDepartmentRoster(
  departmentId: string
): Promise<ApiResult<DepartmentRosterEntry[]>> {
  if (USE_MOCK) return mockGetDepartmentRoster(departmentId);

  const { body, error } = await apiFetch<{ data: DepartmentRosterEntry[] }>(
    `/departments/${departmentId}/roster`
  );
  if (error || !body) return { data: null, error: error ?? "Something went wrong. Please try again." };
  return { data: body.data, error: null };
}

export async function getDepartmentTasks(departmentId: string): Promise<ApiResult<DepartmentTask[]>> {
  if (USE_MOCK) return mockGetDepartmentTasks(departmentId);

  const { body, error } = await apiFetch<{ data: DepartmentTask[] }>(
    `/departments/${departmentId}/tasks`
  );
  if (error || !body) return { data: null, error: error ?? "Something went wrong. Please try again." };
  return { data: body.data, error: null };
}

export async function assignDepartment(
  token: string,
  targetUserId: string,
  departmentId: string | null,
  departmentRole: DepartmentRole
): Promise<ApiResult<null>> {
  if (USE_MOCK) return mockAssignDepartment(token, targetUserId, departmentId, departmentRole);

  const { error } = await apiFetch<null>(`/people/${targetUserId}/department`, {
    method: "PUT",
    token,
    body: { department_id: departmentId, department_role: departmentRole },
  });
  if (error) return { data: null, error };
  return { data: null, error: null };
}
