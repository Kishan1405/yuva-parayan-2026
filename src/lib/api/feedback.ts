import { apiFetch, USE_MOCK } from "./client";
import { mockGetFeedbackQuestions, mockGetMyFeedback, mockSubmitFeedback } from "./mockAdapter";
import type { ApiResult, FeedbackQuestion, FeedbackResponse } from "./types";

export async function getFeedbackQuestions(): Promise<ApiResult<FeedbackQuestion[]>> {
  if (USE_MOCK) return mockGetFeedbackQuestions();

  const { body, error } = await apiFetch<{ data: FeedbackQuestion[] }>("/feedback/questions");
  if (error || !body) return { data: null, error: error ?? "Something went wrong. Please try again." };
  return { data: body.data, error: null };
}

export async function getMyFeedback(token: string): Promise<ApiResult<FeedbackResponse[]>> {
  if (USE_MOCK) return mockGetMyFeedback(token);

  const { body, error } = await apiFetch<{ data: FeedbackResponse[] }>("/feedback/me", { token });
  if (error || !body) return { data: null, error: error ?? "Something went wrong. Please try again." };
  return { data: body.data, error: null };
}

export async function submitFeedback(
  token: string,
  input: {
    event_id: string;
    answers: { question_id: string; rating?: number | null; answer_text?: string | null }[];
  }
): Promise<ApiResult<FeedbackResponse[]>> {
  if (USE_MOCK) return mockSubmitFeedback(token, input);

  const { body, error } = await apiFetch<{ data: FeedbackResponse[] }>("/feedback", {
    method: "POST",
    token,
    body: input,
  });
  if (error || !body) return { data: null, error: error ?? "Something went wrong. Please try again." };
  return { data: body.data, error: null };
}
