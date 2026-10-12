"use client";

import { createContext, useContext, useMemo, useState } from "react";
import {
  addQuestion,
  addReply,
  cardText,
  initialSession,
  saveDraft,
  toggleVote,
  type SessionState,
} from "@/lib/sample-session";
import type { CardText, SampleCourse } from "@/lib/sample-courses";

type SampleSessionApi = {
  state: SessionState;
  addQuestion: (course: SampleCourse, input: { tag: string; title: string; body: string }) => void;
  toggleVote: (courseId: string, questionId: number) => void;
  addReply: (courseId: string, questionId: number, text: string) => void;
  saveDraft: (courseId: string, cardId: string, draft: CardText) => void;
  cardText: (course: SampleCourse, cardId: string) => CardText;
};

const SampleSessionContext = createContext<SampleSessionApi | null>(null);

export function SampleSessionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState(initialSession);

  const api = useMemo<SampleSessionApi>(
    () => ({
      state,
      addQuestion: (course, input) => setState((current) => addQuestion(current, course, input)),
      toggleVote: (courseId, questionId) => setState((current) => toggleVote(current, courseId, questionId)),
      addReply: (courseId, questionId, text) => setState((current) => addReply(current, courseId, questionId, text)),
      saveDraft: (courseId, cardId, draft) => setState((current) => saveDraft(current, courseId, cardId, draft)),
      cardText: (course, cardId) => cardText(course, cardId, state),
    }),
    [state],
  );

  return <SampleSessionContext.Provider value={api}>{children}</SampleSessionContext.Provider>;
}

export function useSampleSession() {
  const session = useContext(SampleSessionContext);
  if (!session) throw new Error("Sample session is missing.");
  return session;
}
