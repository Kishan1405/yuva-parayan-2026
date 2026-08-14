import { apiFetch, USE_MOCK } from "./client";
import { mockLogin, mockMe, mockSetPin, mockSignup, mockUpdateProfile } from "./mockAdapter";
import type { ApiResult, User } from "./types";

export async function signup(input: {
  name: string;
  contact_number: string;
  mandal_id: string;
}): Promise<ApiResult<{ token: string; user: User }>> {
  if (USE_MOCK) return mockSignup(input);

  const { body, error } = await apiFetch<{ data: { token: string; user: User } }>("/auth/signup", {
    method: "POST",
    body: input,
  });
  if (error || !body) return { data: null, error: error ?? "Something went wrong. Please try again." };
  return { data: body.data, error: null };
}

export async function login(input: {
  name: string;
  contact_number: string;
  pin: string;
}): Promise<ApiResult<{ token: string; user: User }>> {
  if (USE_MOCK) return mockLogin(input);

  const { body, error } = await apiFetch<{ data: { token: string; user: User } }>("/auth/login", {
    method: "POST",
    body: input,
  });
  if (error || !body) return { data: null, error: error ?? "Something went wrong. Please try again." };
  return { data: body.data, error: null };
}

export async function me(token: string): Promise<ApiResult<User>> {
  if (USE_MOCK) return mockMe(token);

  const { body, error } = await apiFetch<{ data: User }>("/auth/me", { token });
  if (error || !body) return { data: null, error: error ?? "Something went wrong. Please try again." };
  return { data: body.data, error: null };
}

export async function updateProfile(
  token: string,
  input: { name: string; contact_number: string; mandal_id: string }
): Promise<ApiResult<User>> {
  if (USE_MOCK) return mockUpdateProfile(token, input);

  const { body, error } = await apiFetch<{ data: User }>("/profile", {
    method: "PUT",
    token,
    body: input,
  });
  if (error || !body) return { data: null, error: error ?? "Something went wrong. Please try again." };
  return { data: body.data, error: null };
}

export async function setPin(token: string, pin: string): Promise<ApiResult<null>> {
  if (USE_MOCK) return mockSetPin(token, pin);

  const { error } = await apiFetch<null>("/auth/pin", { method: "POST", token, body: { pin } });
  if (error) return { data: null, error };
  return { data: null, error: null };
}
