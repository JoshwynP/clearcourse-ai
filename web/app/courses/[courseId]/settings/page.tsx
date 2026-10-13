import { notFound, redirect } from "next/navigation";
import { SignedInShell } from "@/components/signed-in-shell";
import { ResetCourseForm } from "@/components/reset-course-form";
import { addCourseStaffAction, addCourseStudentAction, removeCourseStaffAction, removeCourseStudentAction, rotateJoinCodeAction, updateCourseDetailsAction } from "@/lib/actions";
import { courseStaffForOwner, courseStaffRole, courseStudentsForProfessor, memberCourseForUser } from "@/lib/app-store";
import { currentAccount } from "@/lib/accounts";

export default async function CourseSettingsPage({ params, searchParams }: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ error?: string; updated?: string }>;
}) {
  const { courseId } = await params;
  const { error, updated } = await searchParams;
  const user = await currentAccount();
  if (!user) redirect("/sign-in");
  const course = await memberCourseForUser(user.id, courseId);
  const role = await courseStaffRole(user.id, courseId);
  if (!course || (role !== "owner" && role !== "professor")) notFound();
  const students = await courseStudentsForProfessor(user.id, courseId);
  const staff = role === "owner" ? await courseStaffForOwner(user.id, courseId) : [];
  const errors: Record<string, string> = {
    details: "Enter a course code and name within the limits shown.",
    "join-code": "Could not change the join code.",
    "student-email": "Enter a valid student email.",
    student: "That Student account is not available to add or remove. They may already be enrolled.",
    "staff-details": "Enter a valid email and choose Professor or TA.",
    "not-found": "That person needs a ClearCourse account before you can add them.",
    self: "You already belong to this course.",
    role: "A professor needs a Professor account. You can add a Student account as a TA.",
    "not-owner": "Only the course owner can change teaching team access.",
    confirmation: "The confirmation must match the current course code exactly.",
    selection: "Choose at least one reset option. Assignment cards require discussion to be cleared.",
    "reset-failed": "The reset did not finish. Check the course before trying again; this practice app stores discussion and course settings separately.",
    unauthorized: "Only course professors can change these settings.",
  };
  const updates: Record<string, string> = {
    details: "Course details saved.", student: "Student enrollment updated.",
    staff: "Teaching team updated.", reset: "Selected course data cleared.",
    "join-code": "Join code changed. The previous code no longer works.",
  };
  return <SignedInShell courseId={courseId} view="settings"><div className="page">
    <div className="page-head"><div><h1>Course settings</h1><p className="page-subtitle">{course.code} · {course.name}</p></div></div>
    {error ? <p className="notice" role="alert">{errors[error] ?? "Could not update course settings."}</p> : null}
    {updated ? <p className="notice" role="status">{updates[updated] ?? "Course settings updated."}</p> : null}

    <section className="panel panel-pad settings-panel">
      <h2>Course details</h2>
      <p>Edit the name and code shown to everyone in this course. The current join code is <strong>{course.joinCode}</strong>.</p>
      <form className="settings-form" action={updateCourseDetailsAction}>
        <input type="hidden" name="courseId" value={courseId} />
        <div><label htmlFor="settings-code">Course code</label><input className="field" id="settings-code" name="code" defaultValue={course.code} required maxLength={20} /></div>
        <div><label htmlFor="settings-name">Course name</label><input className="field" id="settings-name" name="name" defaultValue={course.name} required maxLength={80} /></div>
        <button className="button primary" type="submit">Save course details</button>
      </form>
      <form className="join-code-form" action={rotateJoinCodeAction}>
        <input type="hidden" name="courseId" value={courseId} />
        <p>Need to stop sharing the old join code? Generate a new one. Enrolled students keep access.</p>
        <button className="button" type="submit">Generate a new join code</button>
      </form>
    </section>

    <section className="panel panel-pad settings-panel">
      <h2>Students</h2>
      <p>Add an existing Student account by email or remove someone from this course. Removing a student also removes their private participation record; their account remains available.</p>
      <form className="staff-form" action={addCourseStudentAction}>
        <input type="hidden" name="courseId" value={courseId} />
        <div><label htmlFor="student-email">Student account email</label><input className="field" id="student-email" name="email" type="email" required /></div>
        <button className="button primary" type="submit">Add student</button>
      </form>
      <h3>Enrolled students ({students.length})</h3>
      {students.length ? <ul className="staff-list">{students.map((person) => <li key={person.id}>
        <div><strong>{person.name}</strong><small>{person.email}</small></div>
        <form action={removeCourseStudentAction}><input type="hidden" name="courseId" value={courseId} />
          <input type="hidden" name="studentId" value={person.id} /><button className="button small" type="submit">Remove student</button></form>
      </li>)}</ul> : <p>No students enrolled yet.</p>}
    </section>

    <section className="panel panel-pad settings-panel">
      <h2>Teaching team</h2>
      <p>Professors can edit cards, manage students, and reset course data. TAs can edit cards and answer questions.</p>
      {role === "owner" ? <>
        <p className="meta">Add someone by the email they used to sign up; no invitation is sent.</p>
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
      </> : <p>The course owner manages teaching team access.</p>}
    </section>

    <section className="panel panel-pad settings-panel reset-section">
      <h2>End of term: wipe selected course data</h2>
      <ResetCourseForm courseId={courseId} code={course.code} />
    </section>
  </div></SignedInShell>;
}
