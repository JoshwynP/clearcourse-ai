import { notFound, redirect } from "next/navigation";
import { SignedInShell } from "@/components/signed-in-shell";
import { addCourseStaffAction, removeCourseStaffAction } from "@/lib/actions";
import { courseStaffForOwner, memberCourseForUser } from "@/lib/app-store";
import { currentAccount } from "@/lib/accounts";

export default async function CourseSettingsPage({ params, searchParams }: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ error?: string; added?: string }>;
}) {
  const { courseId } = await params;
  const { error, added } = await searchParams;
  const user = await currentAccount();
  if (!user) redirect("/sign-in");
  const course = await memberCourseForUser(user.id, courseId);
  if (!course || course.instructorId !== user.id) notFound();
  const staff = await courseStaffForOwner(user.id, courseId);
  const errors: Record<string, string> = {
    details: "Enter a valid email and choose Professor or TA.",
    "not-found": "That person needs a ClearCourse account before you can add them.",
    self: "You already own this course.",
    role: "A professor needs a Professor account. You can add a Student account as a TA.",
    "not-owner": "Only the course owner can change access.",
  };
  return <SignedInShell courseId={courseId} view="settings"><div className="page">
    <div className="page-head"><div><h1>Course settings</h1><p className="page-subtitle">{course.code} · {course.name}</p></div></div>
    <section className="panel panel-pad settings-panel">
      <h2>Course access</h2>
      <p>You are the course owner. Added professors can edit cards and see shared participation levels. TAs can edit cards and answer questions. Only you can change access.</p>
      <p className="meta">Practice accounts only. Add someone by the email they used to sign up; no email invitation is sent.</p>
      {error ? <p className="notice" role="alert">{errors[error] ?? "Could not update course access."}</p> : null}
      {added ? <p className="notice" role="status">Course access updated.</p> : null}
      <form className="staff-form" action={addCourseStaffAction}>
        <input type="hidden" name="courseId" value={courseId} />
        <div><label htmlFor="staff-email">Account email</label><input className="field" id="staff-email" name="email" type="email" required /></div>
        <div><label htmlFor="staff-role">Course role</label><select className="field" id="staff-role" name="role"><option value="professor">Professor</option><option value="ta">Teaching assistant</option></select></div>
        <button className="button primary" type="submit">Add access</button>
      </form>
      <h3>People with access</h3>
      {staff.length ? <ul className="staff-list">{staff.map((person) => <li key={person.id}>
        <div><strong>{person.name}</strong><small>{person.email} · {person.role === "ta" ? "Teaching assistant" : "Professor"}</small></div>
        <form action={removeCourseStaffAction}><input type="hidden" name="courseId" value={courseId} />
          <input type="hidden" name="staffId" value={person.id} /><button className="button small" type="submit">Remove access</button></form>
      </li>)}</ul> : <p>No additional professors or TAs yet.</p>}
    </section>
  </div></SignedInShell>;
}
