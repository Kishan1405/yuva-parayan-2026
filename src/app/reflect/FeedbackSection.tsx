"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, ChevronDown, Lock } from "lucide-react";
import { useSession } from "@/lib/session";
import { getActiveEvent } from "@/lib/api/events";
import { getFeedbackQuestions, getMyFeedback, submitFeedback } from "@/lib/api/feedback";
import { GlassCard } from "@/components/ui/GlassCard";
import { Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { StarRating } from "@/components/ui/StarRating";
import type { Event, FeedbackQuestion, FeedbackResponse } from "@/lib/api/types";

type AnswerMap = Record<string, { rating: number; text: string }>;

function formatEventTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function FeedbackSection() {
  const { deviceToken } = useSession();
  // undefined = still checking, null = confirmed no live Sabha
  const [activeEvent, setActiveEvent] = useState<Event | null | undefined>(undefined);
  const [questions, setQuestions] = useState<FeedbackQuestion[]>([]);
  const [responses, setResponses] = useState<FeedbackResponse[]>([]);
  const [open, setOpen] = useState(false);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    getActiveEvent().then(({ data }) => setActiveEvent(data));
  }, []);

  useEffect(() => {
    getFeedbackQuestions().then(({ data }) => setQuestions(data ?? []));
  }, []);

  useEffect(() => {
    if (!deviceToken) return;
    getMyFeedback(deviceToken).then(({ data }) => setResponses(data ?? []));
  }, [deviceToken]);

  const submitted = useMemo(
    () => !!activeEvent && responses.some((r) => r.event_id === activeEvent.id),
    [responses, activeEvent]
  );

  function openForm() {
    if (!activeEvent) return;
    setJustSaved(false);
    if (open) {
      setOpen(false);
      return;
    }
    const event = activeEvent;
    const initial: AnswerMap = {};
    questions.forEach((q) => {
      const existing = responses.find((r) => r.event_id === event.id && r.question_id === q.id);
      initial[q.id] = { rating: existing?.rating ?? 0, text: existing?.answer_text ?? "" };
    });
    setAnswers(initial);
    setOpen(true);
  }

  async function submit() {
    if (!deviceToken || !activeEvent) return;
    setSaving(true);
    const answersPayload = questions.map((q) => ({
      question_id: q.id,
      rating: q.question_type === "rating" ? answers[q.id]?.rating || null : null,
      answer_text: q.question_type === "text" ? answers[q.id]?.text || null : null,
    }));

    const { data, error } = await submitFeedback(deviceToken, {
      event_id: activeEvent.id,
      answers: answersPayload,
    });
    setSaving(false);
    if (!error && data) {
      setResponses((prev) => [...prev.filter((r) => r.event_id !== activeEvent.id), ...data]);
      setJustSaved(true);
      setOpen(false);
    }
  }

  const statusText = !activeEvent
    ? "Opens once today's Sabha begins"
    : submitted
      ? "Feedback submitted — tap to edit"
      : `Tap to give feedback · ${formatEventTime(activeEvent.scheduled_at)}`;

  return (
    <div className="space-y-3">
      <GlassCard
        interactive={!!activeEvent}
        onClick={openForm}
        className={`flex items-center justify-between py-3.5 ${
          activeEvent ? "cursor-pointer" : "opacity-60"
        }`}
      >
        <div>
          <p className="text-sm font-semibold">{activeEvent?.title ?? "Today's Sabha"}</p>
          <p className="mt-0.5 text-xs text-foreground-muted">{statusText}</p>
        </div>
        {!activeEvent ? (
          <Lock size={18} className="text-foreground-muted" />
        ) : submitted ? (
          <CheckCircle2 size={20} className="text-saffron-deep" />
        ) : (
          <ChevronDown
            size={18}
            className={`text-foreground-muted transition-transform ${open ? "rotate-180" : ""}`}
          />
        )}
      </GlassCard>

      <AnimatePresence initial={false}>
        {open && activeEvent && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
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
              <Button type="button" disabled={saving} onClick={submit} className="w-full">
                {saving ? "Saving…" : "Submit feedback"}
              </Button>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {justSaved && (
        <p className="pl-1 text-xs font-medium text-saffron-deep">
          Thank you for your feedback! 🙏
        </p>
      )}
    </div>
  );
}
