import { apiFetch, USE_MOCK } from "./client";
import { mockGetAnalytics } from "./mockAdapter";
import type { AnalyticsData, ApiResult } from "./types";

// `forEventId` scopes attendance_by_mandal_for_event to one event — omit to
// default to the most recent one.
export async function getAnalytics(
  token: string,
  forEventId?: string
): Promise<ApiResult<AnalyticsData>> {
  if (USE_MOCK) return mockGetAnalytics(token, forEventId);

  const { body, error } = await apiFetch<{ data: AnalyticsData }>("/analytics", {
    token,
    query: { event_id: forEventId },
  });
  if (error || !body) return { data: null, error: error ?? "Something went wrong. Please try again." };
  return { data: body.data, error: null };
}
