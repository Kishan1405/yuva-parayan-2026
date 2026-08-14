import { apiFetch, USE_MOCK } from "./client";
import { mockGetMandalById, mockSearchMandals } from "./mockAdapter";
import type { ApiResult, Mandal, Paginated } from "./types";

export async function searchMandals(
  search?: string,
  page = 1
): Promise<ApiResult<Paginated<Mandal>>> {
  if (USE_MOCK) return mockSearchMandals({ search, page });

  const { body, error } = await apiFetch<Paginated<Mandal>>("/mandals", {
    query: { search, page },
  });
  if (error || !body) return { data: null, error: error ?? "Something went wrong. Please try again." };
  return { data: body, error: null };
}

/** Convenience wrapper for SearchSelect's `onSearch` — flattens away pagination/error handling. */
export async function searchMandalOptions(query: string): Promise<Mandal[]> {
  const { data } = await searchMandals(query);
  return data?.data ?? [];
}

export async function getMandalById(id: string): Promise<ApiResult<Mandal | null>> {
  if (USE_MOCK) return mockGetMandalById(id);

  const { body, error } = await apiFetch<{ data: Mandal | null }>(`/mandals/${id}`);
  if (error) return { data: null, error };
  return { data: body?.data ?? null, error: null };
}
