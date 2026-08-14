import { apiFetch, USE_MOCK } from "./client";
import { mockCreateWallPost, mockListWallPosts } from "./mockAdapter";
import type { ApiResult, WallPost } from "./types";

export async function listWallPosts(): Promise<ApiResult<WallPost[]>> {
  if (USE_MOCK) return mockListWallPosts();

  const { body, error } = await apiFetch<{ data: WallPost[] }>("/wall");
  if (error || !body) return { data: null, error: error ?? "Something went wrong. Please try again." };
  return { data: body.data, error: null };
}

export async function createWallPost(token: string, content: string): Promise<ApiResult<WallPost>> {
  if (USE_MOCK) return mockCreateWallPost(token, content);

  const { body, error } = await apiFetch<{ data: WallPost }>("/wall", {
    method: "POST",
    token,
    body: { content },
  });
  if (error || !body) return { data: null, error: error ?? "Something went wrong. Please try again." };
  return { data: body.data, error: null };
}
