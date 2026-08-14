import { apiFetch, USE_MOCK } from "./client";
import { mockAdminSearchPeople, mockDeletePerson, mockSetUserRole } from "./mockAdapter";
import type { AdminPerson, ApiResult, UserRole } from "./types";

export async function adminSearchPeople(
  token: string,
  query?: string
): Promise<ApiResult<AdminPerson[]>> {
  if (USE_MOCK) return mockAdminSearchPeople(token, query);

  const { body, error } = await apiFetch<{ data: AdminPerson[] }>("/people", {
    token,
    query: { query },
  });
  if (error || !body) return { data: null, error: error ?? "Something went wrong. Please try again." };
  return { data: body.data, error: null };
}

// Role changes are restricted to super_admin — enforced server-side, the
// frontend's own check is UX only.
export async function setUserRole(
  token: string,
  targetUserId: string,
  role: UserRole
): Promise<ApiResult<AdminPerson>> {
  if (USE_MOCK) return mockSetUserRole(token, targetUserId, role);

  const { body, error } = await apiFetch<{ data: AdminPerson }>(`/people/${targetUserId}/role`, {
    method: "PUT",
    token,
    body: { role },
  });
  if (error || !body) return { data: null, error: error ?? "Something went wrong. Please try again." };
  return { data: body.data, error: null };
}

export async function deletePerson(token: string, targetUserId: string): Promise<ApiResult<null>> {
  if (USE_MOCK) return mockDeletePerson(token, targetUserId);

  const { error } = await apiFetch<null>(`/people/${targetUserId}`, { method: "DELETE", token });
  if (error) return { data: null, error };
  return { data: null, error: null };
}
