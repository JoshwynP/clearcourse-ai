"use server";

import { redirect } from "next/navigation";
import { addQuestion, addReply, toggleVote } from "@/lib/content-model";
import { readContent, writeContent } from "@/lib/content-store";
import {
  createCourse,
  endSession,
  joinCourse,
  memberCourse,
  saveCard,
  signInAccount,
  voteToken,
  type Role,
} from "@/lib/identity-model";
import { readIdentity, writeIdentity } from "@/lib/identity-store";
import { clearSessionCookie, currentUser, sessionId, setSessionCookie } from "@/lib/session";

function roleOf(value: FormDataEntryValue | null): Role | null {
  return value === "instructor" || value === "student" ? value : null;
}

export async function signIn(formData: FormData) {
  const role = roleOf(formData.get("role"));
  const name = String(formData.get("name") || "");
  if (!role) redirect("/sign-in?error=role");
  const result = signInAccount(readIdentity(), { name, role });
  if (!result) redirect("/sign-in?error=name");
  writeIdentity(result.state);
  await setSessionCookie(result.sessionId);
  redirect("/");
}

export async function signOut() {
  const id = await sessionId();
  if (id) writeIdentity(endSession(readIdentity(), id));
  await clearSessionCookie();
  redirect("/sign-in");
}

export async function createCourseAction(formData: FormData) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  const next = createCourse(readIdentity(), user.id, { code: String(formData.get("code") || ""), name: String(formData.get("name") || "") });
  if (!next) redirect("/?error=course");
  writeIdentity(next);
  const created = next.courses[next.courses.length - 1];
  redirect(created ? `/courses/${created.id}` : "/");
}

export async function joinCourseAction(formData: FormData) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  const next = joinCourse(readIdentity(), user.id, String(formData.get("code") || ""));
  if (!next) redirect("/?error=code");
  writeIdentity(next);
  redirect("/");
}

export async function askQuestion(formData: FormData) {
  const user = await currentUser();
  const courseId = String(formData.get("courseId") || "");
  if (!user || !memberCourse(readIdentity(), user.id, courseId)) redirect("/sign-in");
  const next = addQuestion(readContent(), courseId, { title: String(formData.get("title") || ""), body: String(formData.get("body") || "") });
  if (next) writeContent(next);
  redirect(`/courses/${courseId}/conversation`);
}

export async function sendReply(formData: FormData) {
  const user = await currentUser();
  const courseId = String(formData.get("courseId") || "");
  const questionId = String(formData.get("questionId") || "");
  if (!user || !memberCourse(readIdentity(), user.id, courseId)) redirect("/sign-in");
  const content = readContent();
  const question = content.questions.find((item) => item.id === questionId && item.courseId === courseId);
  if (!question) redirect(`/courses/${courseId}/conversation`);
  const next = addReply(content, questionId, user.role === "instructor" ? "Instructor" : "Student", String(formData.get("reply") || ""));
  if (next) writeContent(next);
  redirect(`/courses/${courseId}/conversation`);
}

export async function castVote(formData: FormData) {
  const user = await currentUser();
  const courseId = String(formData.get("courseId") || "");
  const questionId = String(formData.get("questionId") || "");
  if (!user || !memberCourse(readIdentity(), user.id, courseId)) redirect("/sign-in");
  const content = readContent();
  const question = content.questions.find((item) => item.id === questionId && item.courseId === courseId);
  if (!question) redirect(`/courses/${courseId}/conversation`);
  const next = toggleVote(content, questionId, voteToken(user.voteKey, questionId));
  if (next) writeContent(next);
  redirect(`/courses/${courseId}/conversation`);
}

export async function saveCourseCard(formData: FormData) {
  const user = await currentUser();
  const courseId = String(formData.get("courseId") || "");
  if (!user) redirect("/sign-in");
  const next = saveCard(readIdentity(), user.id, courseId, {
    summary: String(formData.get("summary") || ""),
    allowed: String(formData.get("allowed") || ""),
    notAllowed: String(formData.get("notAllowed") || ""),
    disclose: String(formData.get("disclose") || ""),
  });
  if (!next) redirect("/");
  writeIdentity(next);
  redirect(`/courses/${courseId}/guidance`);
}
