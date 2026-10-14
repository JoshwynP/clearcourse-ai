"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { authenticateAccount, currentAccount, normalizeEmail } from "@/lib/accounts";
import { addCourseStaffForOwner, addCourseStudentForProfessor, courseStaffRole, createCourseForInstructor, joinCourseAsStudent, memberCourseForUser, removeCourseStaffForOwner, removeCourseStudentForProfessor, resetCourseForProfessor, rotateJoinCodeForProfessor, updateCourseDetailsForProfessor, saveCourseCardForInstructor, saveAssignmentCardForInstructor, setAssignmentStatusForInstructor, assignmentCardsForCourse, type AssignmentDetails } from "@/lib/app-store";
import { addQuestion, addReply, toggleVote } from "@/lib/content-model";
import { updateContent } from "@/lib/content-store";
import { database } from "@/lib/database";
import { voteToken, type Role } from "@/lib/identity-model";
import { addParticipation, setParticipationSharing } from "@/lib/participation-store";
import { parseCardLayout } from "@/lib/card-layout";
import { assignmentEditableKeys, courseEditableKeys } from "@/lib/card-rows";
import { applySetupAnswers, setupQuestions } from "@/lib/card-setup";

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  const success = await authenticateAccount(email, password, "sign-in");
  if (!success) redirect("/sign-in?error=credentials");
  redirect("/");
}

export async function signUp(formData: FormData) {
  const password = String(formData.get("password") || "");
  if (password !== String(formData.get("confirmPassword") || "")) redirect("/sign-up?error=password");
  const role = formData.get("role");
  const selectedRole = role === "instructor" || role === "student" ? role as Role : undefined;
  const success = await authenticateAccount(
    String(formData.get("email") || ""), password,
    "sign-up", selectedRole, String(formData.get("name") || ""),
  );
  if (!success) redirect("/sign-up?error=account");
  redirect("/");
}

export async function acknowledgeWelcome() {
  const user = await currentAccount();
  if (!user) redirect("/sign-in");
  await database().query(
    "update identity.profile set onboarding_acknowledged_at = now() where user_id = $1 and onboarding_acknowledged_at is null",
    [user.id],
  );
}

export async function signOut() {
  await auth().api.signOut({ headers: await headers() });
  redirect("/sign-in");
}

export async function updateAccountDetails(formData: FormData) {
  const user = await currentAccount();
  if (!user) redirect("/sign-in");
  const name = String(formData.get("name") || "").trim();
  const email = normalizeEmail(String(formData.get("email") || ""));
  if (!name || name.length > 100) redirect("/account?error=name");
  if (!email) redirect("/account?error=email");
  const requestHeaders = await headers();
  const currentEmail = normalizeEmail(user.email) ?? user.email;
  let changed = false;
  if (name !== user.name) {
    try {
      await auth().api.updateUser({ body: { name }, headers: requestHeaders });
      changed = true;
    } catch {
      redirect("/account?error=name");
    }
  }
  if (email !== currentEmail) {
    const password = String(formData.get("currentPassword") || "");
    if (password.length < 10 || password.length > 128) redirect("/account?error=email-password");
    const taken = await database().query(
      'select id from public."user" where lower(email) = $1 and id <> $2',
      [email, user.id],
    );
    if (taken.rowCount) redirect("/account?error=email-taken");
    try {
      await auth().api.verifyPassword({ body: { password }, headers: requestHeaders });
      await auth().api.changeEmail({ body: { newEmail: email }, headers: requestHeaders });
      changed = true;
    } catch {
      redirect("/account?error=email-password");
    }
  }
  redirect(changed ? "/account?updated=details" : "/account?updated=same");
}

export async function changeAccountPassword(formData: FormData) {
  const user = await currentAccount();
  if (!user) redirect("/sign-in");
  const currentPassword = String(formData.get("currentPassword") || "");
  const password = String(formData.get("password") || "");
  if (password !== String(formData.get("confirmPassword") || "")) redirect("/account?error=password-match");
  if (password.length < 10 || password.length > 128 || currentPassword.length < 10 || currentPassword.length > 128) {
    redirect("/account?error=password");
  }
  try {
    await auth().api.changePassword({
      body: { currentPassword, newPassword: password, revokeOtherSessions: true },
      headers: await headers(),
    });
  } catch {
    redirect("/account?error=password");
  }
  redirect("/account?updated=password");
}

export async function createCourseAction(formData: FormData) {
  const user = await currentAccount();
  if (!user) redirect("/sign-in");
  if (user.role !== "instructor") redirect("/");
  const id = await createCourseForInstructor(user.id, String(formData.get("code") || ""), String(formData.get("name") || ""), formData.get("template") === "example");
  redirect(id ? `/courses/${id}` : "/?error=course");
}

export async function joinCourseAction(formData: FormData) {
  const user = await currentAccount();
  if (!user) redirect("/sign-in");
  if (user.role !== "student") redirect("/");
  const ok = await joinCourseAsStudent(user.id, String(formData.get("code") || ""));
  redirect(ok ? "/" : "/?error=code");
}

export async function askQuestion(formData: FormData) {
  const user = await currentAccount();
  const courseId = String(formData.get("courseId") || "");
  if (!user) redirect("/sign-in");
  if (!await memberCourseForUser(user.id, courseId)) redirect("/");
  const tag = String(formData.get("tag") || "course");
  if (tag !== "course" && !(await assignmentCardsForCourse(courseId)).some((item) => item.id === tag)) redirect("/");
  const saved = await updateContent(courseId, (state) => addQuestion(state, courseId, {
    title: String(formData.get("title") || ""), body: String(formData.get("body") || ""), tag,
  }));
  if (saved && user.role === "student") await addParticipation(user.id, courseId, "questions");
  redirect(`/courses/${courseId}/conversation`);
}

export async function sendReply(formData: FormData) {
  const user = await currentAccount();
  const courseId = String(formData.get("courseId") || "");
  if (!user) redirect("/sign-in");
  if (!await memberCourseForUser(user.id, courseId)) redirect("/");
  const questionId = String(formData.get("questionId") || "");
  const staffRole = await courseStaffRole(user.id, courseId);
  const saved = await updateContent(courseId, (state) => {
    if (!state.questions.some((item) => item.id === questionId && item.courseId === courseId)) return null;
    return addReply(state, questionId, staffRole === "ta" ? "Teaching assistant" : staffRole ? "Instructor" : "Student", String(formData.get("reply") || ""));
  });
  if (saved && user.role === "student") await addParticipation(user.id, courseId, "comments");
  redirect(`/courses/${courseId}/conversation`);
}

export async function castVote(formData: FormData) {
  const user = await currentAccount();
  const courseId = String(formData.get("courseId") || "");
  if (!user) redirect("/sign-in");
  if (!await memberCourseForUser(user.id, courseId)) redirect("/");
  const questionId = String(formData.get("questionId") || "");
  const result = await database().query<{ vote_key: string }>("select vote_key from identity.profile where user_id = $1", [user.id]);
  if (!result.rows[0]) redirect("/");
  const token = voteToken(result.rows[0].vote_key, questionId);
  let delta = 0;
  const saved = await updateContent(courseId, (state) => {
    delta = state.votes.some((vote) => vote.questionId === questionId && vote.token === token) ? -1 : 1;
    return toggleVote(state, questionId, token);
  });
  if (saved && user.role === "student") await addParticipation(user.id, courseId, "upvotes", delta);
  redirect(`/courses/${courseId}/conversation`);
}

export async function saveCourseCard(formData: FormData) {
  const user = await currentAccount();
  const courseId = String(formData.get("courseId") || "");
  if (!user) redirect("/sign-in");
  const layout = parseCardLayout(formData.get("layout"), courseEditableKeys);
  if (!layout) redirect(`/courses/${courseId}/studio?card=course&error=fields`);
  const preview = formData.get("intent") === "preview";
  const ok = await saveCourseCardForInstructor(user.id, courseId, {
    summary: String(formData.get("summary") || ""),
    allowed: String(formData.get("allowed") || ""),
    notAllowed: String(formData.get("notAllowed") || ""),
    disclose: String(formData.get("disclose") || ""),
    opening: String(formData.get("opening") || ""),
    counts: String(formData.get("counts") || ""),
    permitted: String(formData.get("permitted") || ""),
    transparency: String(formData.get("transparency") || ""),
    suspected: String(formData.get("suspected") || ""),
    warning: String(formData.get("warning") || ""),
    resources: String(formData.get("resources") || ""),
    layout,
  });
  redirect(ok ? `/courses/${courseId}/guidance${preview ? "?preview=1" : ""}` : "/");
}

export async function saveAssignmentCard(formData: FormData) {
  const user = await currentAccount();
  const courseId = String(formData.get("courseId") || "");
  if (!user) redirect("/sign-in");
  const layout = parseCardLayout(formData.get("layout"), assignmentEditableKeys);
  if (!layout) redirect(`/courses/${courseId}/studio?card=${String(formData.get("id") || "new")}&error=fields`);
  const details = Object.fromEntries(
    (["due", "learning", "permitted", "allowed", "notAllowed", "disclose", "discloseNot", "processRequested", "processNot", "bonusPercent", "bonusRequirements", "resources", "other", "learn", "opening"] as const)
      .map((key) => [key, String(formData.get(key) || "")]),
  ) as unknown as AssignmentDetails;
  details.layout = layout;
  const id = String(formData.get("id") || "") || undefined;
  const editor = `/courses/${courseId}/studio?card=${id || "new"}`;
  try {
    const savedId = await saveAssignmentCardForInstructor(
      user.id, courseId, id, String(formData.get("identifier") || ""), String(formData.get("title") || ""), details,
    );
    const preview = formData.get("intent") === "preview";
    redirect(savedId ? (preview ? `/courses/${courseId}/guidance?card=${savedId}&preview=1` : `/courses/${courseId}/studio`) : `${editor}&error=card`);
  } catch (error) {
    if ((error as { code?: string }).code === "23505") redirect(`${editor}&error=duplicate`);
    throw error;
  }
}

const blankAssignment: AssignmentDetails = {
  due: "", learning: "", permitted: "", allowed: "", notAllowed: "", disclose: "",
  discloseNot: "", processRequested: "", processNot: "", bonusPercent: "",
  bonusRequirements: "", resources: "", other: "", learn: "", opening: "",
};

export async function applyCardSetup(formData: FormData) {
  const user = await currentAccount();
  const courseId = String(formData.get("courseId") || "");
  if (!user) redirect("/sign-in");
  if (!await courseStaffRole(user.id, courseId)) redirect("/");
  const answers = Object.fromEntries(setupQuestions.map((question) => [question.id, String(formData.get(question.id) || "")]));
  const setup = `/courses/${courseId}/studio/setup`;
  if (formData.get("kind") !== "assignment") {
    const course = await memberCourseForUser(user.id, courseId);
    if (!course) redirect("/");
    const current = Object.fromEntries(Object.entries(course.card).flatMap(([key, value]) => typeof value === "string" ? [[key, value]] : []));
    const filled = applySetupAnswers("course", current, answers);
    const ok = await saveCourseCardForInstructor(user.id, courseId, { ...course.card, ...filled, layout: course.card.layout });
    redirect(ok ? `/courses/${courseId}/studio?card=course` : "/");
  }
  const id = String(formData.get("id") || "") || undefined;
  const existing = id ? (await assignmentCardsForCourse(courseId, true)).find((card) => card.id === id) : undefined;
  if (id && !existing) redirect(`/courses/${courseId}/studio`);
  const base = existing?.details ?? blankAssignment;
  const current = Object.fromEntries(Object.entries(base).flatMap(([key, value]) => typeof value === "string" ? [[key, value]] : []));
  const filled = applySetupAnswers("assignment", current, answers);
  const editor = `${setup}?card=${id || "new"}`;
  try {
    const savedId = await saveAssignmentCardForInstructor(
      user.id, courseId, id,
      existing?.identifier ?? String(formData.get("identifier") || ""),
      existing?.title ?? String(formData.get("title") || ""),
      { ...base, ...filled, layout: base.layout },
    );
    redirect(savedId ? `/courses/${courseId}/studio?card=${savedId}` : `${editor}&error=card`);
  } catch (error) {
    if ((error as { code?: string }).code === "23505") redirect(`${editor}&error=duplicate`);
    throw error;
  }
}

export async function prepareTermReminder(formData: FormData) {
  const user = await currentAccount();
  const courseId = String(formData.get("courseId") || "");
  if (!user) redirect("/sign-in");
  const role = await courseStaffRole(user.id, courseId);
  if (role !== "owner" && role !== "professor") redirect("/");
  redirect(`/courses/${courseId}/settings?updated=reminder`);
}

export async function setAssignmentStatus(formData: FormData) {
  const user = await currentAccount();
  const courseId = String(formData.get("courseId") || "");
  if (!user) redirect("/sign-in");
  const status = String(formData.get("status") || "");
  if (status !== "draft" && status !== "published" && status !== "archived") redirect("/");
  const ok = await setAssignmentStatusForInstructor(user.id, courseId, String(formData.get("id") || ""), status);
  const destination = formData.get("returnTo") === "guidance" ? "guidance" : "studio";
  redirect(ok ? `/courses/${courseId}/${destination}` : "/");
}

export async function changeParticipationSharing(formData: FormData) {
  const user = await currentAccount();
  const courseId = String(formData.get("courseId") || "");
  if (!user) redirect("/sign-in");
  if (user.role !== "student") redirect("/");
  const shared = formData.get("shared") === "true";
  if (!await memberCourseForUser(user.id, courseId)) redirect("/");
  await setParticipationSharing(user.id, courseId, shared);
  redirect(`/courses/${courseId}/participation`);
}

export async function addCourseStaffAction(formData: FormData) {
  const user = await currentAccount();
  const courseId = String(formData.get("courseId") || "");
  if (!user) redirect("/sign-in");
  const role = formData.get("role");
  const email = normalizeEmail(String(formData.get("email") || ""));
  if (!email || (role !== "professor" && role !== "ta")) redirect(`/courses/${courseId}/settings?error=staff-details`);
  const result = await addCourseStaffForOwner(user.id, courseId, email, role);
  redirect(result === "ok" ? `/courses/${courseId}/settings?updated=staff` : `/courses/${courseId}/settings?error=${result}`);
}

export async function removeCourseStaffAction(formData: FormData) {
  const user = await currentAccount();
  const courseId = String(formData.get("courseId") || "");
  if (!user) redirect("/sign-in");
  const ok = await removeCourseStaffForOwner(user.id, courseId, String(formData.get("staffId") || ""));
  redirect(`/courses/${courseId}/settings?${ok ? "updated=staff" : "error=not-owner"}`);
}

export async function updateCourseDetailsAction(formData: FormData) {
  const user = await currentAccount();
  const courseId = String(formData.get("courseId") || "");
  if (!user) redirect("/sign-in");
  const ok = await updateCourseDetailsForProfessor(user.id, courseId, String(formData.get("code") || ""), String(formData.get("name") || ""));
  redirect(`/courses/${courseId}/settings?${ok ? "updated=details" : "error=details"}`);
}

export async function rotateJoinCodeAction(formData: FormData) {
  const user = await currentAccount();
  const courseId = String(formData.get("courseId") || "");
  if (!user) redirect("/sign-in");
  const ok = await rotateJoinCodeForProfessor(user.id, courseId);
  redirect(`/courses/${courseId}/settings?${ok ? "updated=join-code" : "error=join-code"}`);
}

export async function addCourseStudentAction(formData: FormData) {
  const user = await currentAccount();
  const courseId = String(formData.get("courseId") || "");
  if (!user) redirect("/sign-in");
  const email = normalizeEmail(String(formData.get("email") || ""));
  if (!email) redirect(`/courses/${courseId}/settings?error=student-email`);
  const ok = await addCourseStudentForProfessor(user.id, courseId, email);
  redirect(`/courses/${courseId}/settings?${ok ? "updated=student" : "error=student"}`);
}

export async function removeCourseStudentAction(formData: FormData) {
  const user = await currentAccount();
  const courseId = String(formData.get("courseId") || "");
  if (!user) redirect("/sign-in");
  const ok = await removeCourseStudentForProfessor(user.id, courseId, String(formData.get("studentId") || ""));
  redirect(`/courses/${courseId}/settings?${ok ? "updated=student" : "error=student"}`);
}

export async function resetCourseAction(formData: FormData) {
  const user = await currentAccount();
  const courseId = String(formData.get("courseId") || "");
  if (!user) redirect("/sign-in");
  let result: string;
  try {
    result = await resetCourseForProfessor(user.id, courseId, {
      discussion: formData.get("discussion") === "on",
      students: formData.get("students") === "on",
      assignments: formData.get("assignments") === "on",
      courseCard: formData.get("courseCard") === "on",
    }, String(formData.get("confirmation") || ""));
  } catch {
    redirect(`/courses/${courseId}/settings?error=reset-failed`);
  }
  redirect(`/courses/${courseId}/settings?${result === "ok" ? "updated=reset" : `error=${result}`}`);
}
