import { createHmac, randomBytes, randomInt } from "node:crypto";

export type Role = "instructor" | "student";

export type CardFields = {
  summary: string;
  allowed: string;
  notAllowed: string;
  disclose: string;
  opening?: string;
  counts?: string;
  permitted?: string;
  transparency?: string;
  suspected?: string;
  warning?: string;
  resources?: string;
};

export type UserRecord = {
  id: string;
  name: string;
  role: Role;
  voteKey: string;
};

export type CourseRecord = {
  id: string;
  code: string;
  name: string;
  joinCode: string;
  instructorId: string;
  card: CardFields;
};

export type IdentityState = {
  users: UserRecord[];
  sessions: { id: string; userId: string }[];
  courses: CourseRecord[];
  memberships: { courseId: string; userId: string }[];
};

const joinAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function emptyIdentity(): IdentityState {
  return { users: [], sessions: [], courses: [], memberships: [] };
}

export function emptyCard(): CardFields {
  return { summary: "", allowed: "", notAllowed: "", disclose: "" };
}

export function voteToken(voteKey: string, questionId: string) {
  return createHmac("sha256", voteKey).update(questionId).digest("hex");
}

export function signInAccount(state: IdentityState, input: { name: string; role: Role }): { state: IdentityState; sessionId: string } | null {
  const name = input.name.trim();
  if (!name || (input.role !== "instructor" && input.role !== "student")) return null;
  const existing = state.users.find((user) => user.name === name && user.role === input.role);
  const user: UserRecord = existing || { id: randomBytes(16).toString("hex"), name, role: input.role, voteKey: randomBytes(32).toString("hex") };
  const sessionId = randomBytes(16).toString("hex");
  return {
    sessionId,
    state: {
      ...state,
      users: existing ? state.users : [...state.users, user],
      sessions: [...state.sessions, { id: sessionId, userId: user.id }],
    },
  };
}

export function userForSession(state: IdentityState, sessionId: string): UserRecord | undefined {
  const session = state.sessions.find((item) => item.id === sessionId);
  return session ? state.users.find((user) => user.id === session.userId) : undefined;
}

export function endSession(state: IdentityState, sessionId: string): IdentityState {
  return { ...state, sessions: state.sessions.filter((item) => item.id !== sessionId) };
}

export function createCourse(state: IdentityState, instructorId: string, input: { code: string; name: string }): IdentityState | null {
  const instructor = state.users.find((user) => user.id === instructorId);
  const code = input.code.trim();
  const name = input.name.trim();
  if (!instructor || instructor.role !== "instructor" || !code || !name) return null;
  const course: CourseRecord = {
    id: randomBytes(16).toString("hex"),
    code,
    name,
    joinCode: joinCode(),
    instructorId,
    card: emptyCard(),
  };
  return {
    ...state,
    courses: [...state.courses, course],
    memberships: [...state.memberships, { courseId: course.id, userId: instructorId }],
  };
}

export function joinCourse(state: IdentityState, studentId: string, code: string): IdentityState | null {
  const student = state.users.find((user) => user.id === studentId);
  const course = state.courses.find((item) => item.joinCode === code.trim().toUpperCase());
  if (!student || student.role !== "student" || !course) return null;
  if (state.memberships.some((item) => item.courseId === course.id && item.userId === studentId)) return state;
  return { ...state, memberships: [...state.memberships, { courseId: course.id, userId: studentId }] };
}

export function coursesFor(state: IdentityState, userId: string): CourseRecord[] {
  const ids = new Set(state.memberships.filter((item) => item.userId === userId).map((item) => item.courseId));
  return state.courses.filter((course) => ids.has(course.id));
}

export function memberCourse(state: IdentityState, userId: string, courseId: string): CourseRecord | undefined {
  return coursesFor(state, userId).find((course) => course.id === courseId);
}

export function saveCard(state: IdentityState, instructorId: string, courseId: string, card: CardFields): IdentityState | null {
  const course = state.courses.find((item) => item.id === courseId && item.instructorId === instructorId);
  if (!course) return null;
  const next = { summary: card.summary.trim(), allowed: card.allowed.trim(), notAllowed: card.notAllowed.trim(), disclose: card.disclose.trim() };
  return { ...state, courses: state.courses.map((item) => (item.id === courseId ? { ...item, card: next } : item)) };
}

function joinCode() {
  return Array.from({ length: 8 }, () => joinAlphabet[randomInt(joinAlphabet.length)]).join("");
}
