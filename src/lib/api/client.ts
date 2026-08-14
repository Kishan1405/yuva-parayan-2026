// Thin fetch wrapper for the Laravel API described in docs/api-contract.md.
// Only used when NEXT_PUBLIC_API_URL is set — see USE_MOCK. Domain modules
// (auth.ts, attendance.ts, mandals.ts) call this directly and unwrap the
// `{ data, meta? }` envelope themselves; when USE_MOCK is true they call
// mockAdapter.ts instead, which implements the same contract in memory.

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

export const USE_MOCK = !API_BASE;

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  token?: string | null;
  query?: Record<string, string | number | undefined | null>;
}

function buildUrl(path: string, query?: RequestOptions["query"]) {
  const base = API_BASE!.endsWith("/") ? API_BASE! : `${API_BASE}/`;
  const url = new URL(path.replace(/^\//, ""), base);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

function friendlyMessage(message: string | undefined, status: number): string {
  if (message) return message;
  if (status === 401) return "You need to sign in again.";
  if (status === 403) return "You don't have permission to do that.";
  if (status === 404) return "Not found.";
  return "Something went wrong. Please try again.";
}

/** `body` is the full parsed JSON envelope from the API (e.g. `{ data: User }`), not unwrapped. */
export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {}
): Promise<{ body: T | null; error: string | null }> {
  try {
    const res = await fetch(buildUrl(path, options.query), {
      method: options.method ?? "GET",
      headers: {
        Accept: "application/json",
        ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });

    if (res.status === 204) return { body: null, error: null };

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      return { body: null, error: friendlyMessage(json?.message, res.status) };
    }

    return { body: json as T, error: null };
  } catch {
    return { body: null, error: "Network error. Check your connection and try again." };
  }
}
