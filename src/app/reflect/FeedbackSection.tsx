"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronDown, Lock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/session";
import { EVENT_DAYS, isFeedbackUnlocked, type EventDay } from "@/lib/event";
import { GlassCard } from "@/components/ui/GlassCard";
import { Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { StarRating } from "@/components/ui/StarRating";
import type { FeedbackQuestion, FeedbackResponse } from "@/lib/database.types";

type AnswerMap = Record<string, { rating: number; text: string }>;

export function FeedbackSection() {
  const { user } = useSession();
  const [questions, setQuestions] = useState<FeedbackQuestion[]>([]);
  const [responses, setResponses] = useState<FeedbackResponse[]>([]);
  const [openDay, setOpenDay] = useState<number | null>(null);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [saving, setSaving] = useState(false);
  const [justSavedDay, setJustSavedDay] = useState<number | null>(null);

  useEffect(() => {
    supabase
      .from("feedback_questions")
      .select("*")
      .order("sort_order")
      .then(({ data }) => setQuestions(data ?? []));
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("feedback_responses")
      .select("*")
      .eq("user_id", user.id)
      .then(({ data }) => setResponses(data ?? []));
  }, [user]);

  const submittedDays = useMemo(() => {
    const days = new Set<number>();
    responses.forEach((r) => days.add(r.day));
    return days;
  }, [responses]);

  function openForm(day: EventDay) {
    setJustSavedDay(null);
    if (openDay === day.day) {
      setOpenDay(null);
      return;
    }
    const initial: AnswerMap = {};
    questions.forEach((q) => {
      const existing = responses.find((r) => r.day === day.day && r.question_id === q.id);
      initial[q.id] = {
        rating: existing?.rating ?? 0,
        text: existing?.answer_text ?? "",
      };
    });
    setAnswers(initial);
    setOpenDay(day.day);
  }

  async function submit(day: number) {
    if (!user) return;
    setSaving(true);
    const rows = questions.map((q) => ({
      user_id: user.id,
      question_id: q.id,
      day,
      rating: q.question_type === "rating" ? answers[q.id]?.rating || null : null,
      answer_text: q.question_type === "text" ? answers[q.id]?.text || null : null,
    }));

    const { error } = await supabase
      .from("feedback_responses")
      .upsert(rows, { onConflict: "user_id,question_id,day" });

    setSaving(false);
    if (!error) {
      const { data } = await supabase
        .from("feedback_responses")
        .select("*")
        .eq("user_id", user.id);
      setResponses(data ?? []);
      setJustSavedDay(day);
      setOpenDay(null);
    }
  }

  return (
    <div className="space-y-3">
      {EVENT_DAYS.map((day) => {
        const unlocked = isFeedbackUnlocked(day);
        const submitted = submittedDays.has(day.day);
        const isOpen = openDay === day.day;

        return (
          <div key={day.day}>
            <GlassCard
              onClick={() => unlocked && openForm(day)}
              className={`flex items-center justify-between py-3.5 ${
                unlocked ? "cursor-pointer transition hover:brightness-105" : "opacity-60"
              }`}
            >
              <div>
                <p className="text-sm font-semibold">{day.label}</p>
                <p className="mt-0.5 text-xs text-foreground-muted">
                  {!unlocked
                    ? "Opens on this day"
                    : submitted
                    ? "Feedback submitted — tap to edit"
                    : "Tap to give feedback"}
                </p>
              </div>
              {!unlocked ? (
                <Lock size={18} className="text-foreground-muted" />
              ) : submitted ? (
                <CheckCircle2 size={20} className="text-saffron-deep" />
              ) : (
                <ChevronDown
                  size={18}
                  className={`text-foreground-muted transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
              )}
            </GlassCard>

            {isOpen && (
              <GlassCard strong className="mt-2 space-y-5">
                {questions.map((q) => (
                  <div key={q.id}>
                    <p className="mb-2 text-sm font-medium">{q.question_text}</p>
                    {q.question_type === "rating" ? (
                      <StarRating
                        value={answers[q.id]?.rating ?? 0}
                        onChange={(v) =>
                          setAnswers((prev) => ({
                            ...prev,
                            [q.id]: { ...prev[q.id], rating: v, text: prev[q.id]?.text ?? "" },
                          }))
                        }
                      />
                    ) : (
                      <Textarea
                        rows={2}
                        value={answers[q.id]?.text ?? ""}
                        onChange={(e) =>
                          setAnswers((prev) => ({
                            ...prev,
                            [q.id]: { rating: prev[q.id]?.rating ?? 0, text: e.target.value },
                          }))
                        }
                        placeholder="Type your answer…"
                      />
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  disabled={saving}
                  onClick={() => submit(day.day)}
                  className="w-full"
                >
                  {saving ? "Saving…" : "Submit feedback"}
                </Button>
              </GlassCard>
            )}

            {justSavedDay === day.day && (
              <p className="mt-2 pl-1 text-xs font-medium text-saffron-deep">
                Thank you for your feedback! 🙏
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
