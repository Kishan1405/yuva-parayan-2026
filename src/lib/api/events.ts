import { apiFetch, USE_MOCK } from "./client";
import { mockEndEvent, mockLaunchEvent, mockGetActiveEvent, mockListEvents } from "./mockAdapter";
import type { ApiResult, Event, Paginated } from "./types";

// Public — no token. "Visible to all users" means any signed-up account,
// not just admins, can see whether a Sabha is currently live.
export async function getActiveEvent(): Promise<ApiResult<Event | null>> {
  if (USE_MOCK) return mockGetActiveEvent();

  const { body, error } = await apiFetch<{ data: Event | null }>("/events/active");
  if (error) return { data: null, error };
  return { data: body?.data ?? null, error: null };
}

export async function launchEvent(
  token: string,
  input: { title?: string; scheduled_at?: string }
): Promise<ApiResult<Event>> {
  if (USE_MOCK) return mockLaunchEvent(token, input);

  const { body, error } = await apiFetch<{ data: Event }>("/events", {
    method: "POST",
    token,
    body: input,
  });
  if (error || !body) return { data: null, error: error ?? "Could not launch the Sabha." };
  return { data: body.data, error: null };
}

export async function endEvent(token: string, eventId: string): Promise<ApiResult<null>> {
  if (USE_MOCK) return mockEndEvent(token, eventId);

  const { error } = await apiFetch<null>(`/events/${eventId}/end`, { method: "POST", token });
  if (error) return { data: null, error };
  return { data: null, error: null };
}

export async function listEvents(token: string, page = 1): Promise<ApiResult<Paginated<Event>>> {
  if (USE_MOCK) return mockListEvents(token, page);

  const { body, error } = await apiFetch<Paginated<Event>>("/events", { token, query: { page } });
  if (error || !body) return { data: null, error: error ?? "Could not load past Sabhas." };
  return { data: body, error: null };
}
