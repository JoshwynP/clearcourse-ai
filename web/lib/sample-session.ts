import {
  courses,
  isAllowedTag,
  type CardText,
  type Question,
  type SampleCourse,
} from "@/lib/sample-courses";

export type SessionState = {
  questions: Record<string, Question[]>;
  drafts: Record<string, Record<string, CardText>>;
};

export function initialSession(): SessionState {
  const questions: Record<string, Question[]> = {};
  for (const course of courses) {
    questions[course.id] = course.questions.map((question) => ({
      ...question,
      replies: question.replies.map((reply) => ({ ...reply })),
    }));
  }
  return { questions, drafts: {} };
}

export function addQuestion(
  state: SessionState,
  course: SampleCourse,
  input: { tag: string; title: string; body: string },
): SessionState {
  const title = input.title.trim();
  const body = input.body.trim();
  if (!title || !isAllowedTag(course, input.tag)) return state;
  const existing = state.questions[course.id] ?? [];
  const nextId = existing.reduce((max, question) => Math.max(max, question.id), 0) + 1;
  const question: Question = {
    id: nextId,
    tag: input.tag,
    title,
    body,
    votes: 0,
    replies: [],
    time: "This sample",
    voted: false,
  };
  return {
    ...state,
    questions: { ...state.questions, [course.id]: [question, ...existing] },
  };
}

export function toggleVote(state: SessionState, courseId: string, questionId: number): SessionState {
  const questions = state.questions[courseId];
  if (!questions) return state;
  return {
    ...state,
    questions: {
      ...state.questions,
      [courseId]: questions.map((question) => {
        if (question.id !== questionId) return question;
        const voted = !question.voted;
        return { ...question, voted, votes: question.votes + (voted ? 1 : -1) };
      }),
    },
  };
}

export function addReply(
  state: SessionState,
  courseId: string,
  questionId: number,
  text: string,
): SessionState {
  const reply = text.trim();
  const questions = state.questions[courseId];
  if (!reply || !questions) return state;
  return {
    ...state,
    questions: {
      ...state.questions,
      [courseId]: questions.map((question) =>
        question.id === questionId
          ? { ...question, replies: [...question.replies, { role: "Reply", text: reply }] }
          : question,
      ),
    },
  };
}

export function saveDraft(
  state: SessionState,
  courseId: string,
  cardId: string,
  draft: CardText,
): SessionState {
  const courseDrafts = state.drafts[courseId] ?? {};
  return {
    ...state,
    drafts: {
      ...state.drafts,
      [courseId]: {
        ...courseDrafts,
        [cardId]: {
          allowed: draft.allowed.trim(),
          notAllowed: draft.notAllowed.trim(),
          disclose: draft.disclose.trim(),
        },
      },
    },
  };
}

export function cardText(course: SampleCourse, cardId: string, state: SessionState): CardText {
  const source =
    cardId === "course" ? course.card : course.assignments.find((assignment) => assignment.id === cardId);
  const draft = state.drafts[course.id]?.[cardId];
  return {
    allowed: draft?.allowed ?? source?.allowed ?? "",
    notAllowed: draft?.notAllowed ?? source?.notAllowed ?? "",
    disclose: draft?.disclose ?? source?.disclose ?? "",
  };
}
