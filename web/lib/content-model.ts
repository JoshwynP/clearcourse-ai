import { randomBytes } from "node:crypto";

export type ReplyRole = "Instructor" | "Teaching assistant" | "Student";

export type ContentState = {
  questions: { id: string; courseId: string; tag: string; title: string; body: string }[];
  replies: { id: string; questionId: string; role: ReplyRole; text: string }[];
  votes: { questionId: string; token: string }[];
};

export type ListedQuestion = {
  id: string;
  tag: string;
  title: string;
  body: string;
  votes: number;
  voted: boolean;
  replies: { role: ReplyRole; text: string }[];
};

export function emptyContent(): ContentState {
  return { questions: [], replies: [], votes: [] };
}

export function addQuestion(state: ContentState, courseId: string, input: { title: string; body: string; tag?: string }): ContentState | null {
  const title = input.title.trim();
  const body = input.body.trim();
  if (!courseId || !title) return null;
  return {
    ...state,
    questions: [{ id: randomBytes(16).toString("hex"), courseId, tag: input.tag || "course", title, body }, ...state.questions],
  };
}

export function addReply(state: ContentState, questionId: string, role: ReplyRole, text: string): ContentState | null {
  const reply = text.trim();
  if (!state.questions.some((question) => question.id === questionId) || !reply) return null;
  return { ...state, replies: [...state.replies, { id: randomBytes(16).toString("hex"), questionId, role, text: reply }] };
}

export function toggleVote(state: ContentState, questionId: string, token: string): ContentState | null {
  if (!token || !state.questions.some((question) => question.id === questionId)) return null;
  const existing = state.votes.some((vote) => vote.questionId === questionId && vote.token === token);
  return {
    ...state,
    votes: existing ? state.votes.filter((vote) => !(vote.questionId === questionId && vote.token === token)) : [...state.votes, { questionId, token }],
  };
}

export function listedQuestions(state: ContentState, courseId: string, tokenFor?: (questionId: string) => string): ListedQuestion[] {
  return state.questions
    .filter((question) => question.courseId === courseId)
    .map((question) => {
      const token = tokenFor?.(question.id);
      return {
        id: question.id,
        tag: question.tag,
        title: question.title,
        body: question.body,
        votes: state.votes.filter((vote) => vote.questionId === question.id).length,
        voted: Boolean(token && state.votes.some((vote) => vote.questionId === question.id && vote.token === token)),
        replies: state.replies.filter((reply) => reply.questionId === question.id).map((reply) => ({ role: reply.role, text: reply.text })),
      };
    });
}
