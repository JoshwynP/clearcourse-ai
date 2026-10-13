import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { SignedInShell } from "@/components/signed-in-shell";
import { createCourseAction, joinCourseAction } from "@/lib/actions";
import { coursesForUser } from "@/lib/app-store";
import { currentAccount } from "@/lib/accounts";

export const dynamic = "force-dynamic";

export default async function HomePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await currentAccount();
  const { error } = await searchParams;
  const mine = user ? await coursesForUser(user.id) : [];

  const page = (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>AI guidance, made clear</h1>
        </div>
      </div>
      <p className="lead">
        ClearCourse AI helps instructors state clearly, per course and per assignment, how generative AI may and may not be used.
      </p>
      {user ? (
        <>
          {error === "code" ? <p>That code does not match a course.</p> : null}
          {error === "course" ? <p>Enter a course code and a course name.</p> : null}
          <h2 className="section-heading">Your courses</h2>
          <p className="page-subtitle">
            {user.role === "instructor" ? "Create a course, then give students the join code." : "Enter the join code from your professor."}
          </p>
          <ul className="course-list">
            {mine.map((course) => (
              <li key={course.id}>
                <Link href={`/courses/${course.id}`}>
                  <strong>{course.code}</strong>
                  <span className="course-name">{course.name}</span>
                </Link>
              </li>
            ))}
          </ul>
          {mine.length === 0 ? <p className="meta">No courses yet.</p> : null}
          {user.role === "instructor" ? (
            <div className="course-create-options">
              <form className="panel panel-pad composer" action={createCourseAction}>
                <h2>Start with an example course</h2>
                <p>A fictional course with a filled Course AI card and two assignment cards. You can edit every card.</p>
                <input type="hidden" name="template" value="example" />
                <button className="button" type="submit">Create example course</button>
              </form>
              <form className="panel panel-pad composer" action={createCourseAction}>
                <h2>Create from scratch</h2>
                <label htmlFor="code">Course code</label>
                <input className="field" id="code" name="code" required maxLength={20} />
                <label htmlFor="course-name">Course name</label>
                <input className="field" id="course-name" name="name" required maxLength={80} />
                <button className="button primary" type="submit">Create course</button>
              </form>
            </div>
          ) : (
            <form className="panel panel-pad composer" action={joinCourseAction}>
              <h2>Join a course</h2>
              <label htmlFor="join-code">Join code</label>
              <input className="field" id="join-code" name="code" required maxLength={12} autoCapitalize="characters" />
              <button className="button primary" type="submit">
                Join course
              </button>
            </form>
          )}
        </>
      ) : (
        <>
          <p>Sign in to view your courses, AI cards, discussion board, and participation.</p>
          <p className="home-actions">
            <Link className="button primary" href="/sign-in">
              Sign in
            </Link>
            <Link className="button" href="/sign-up">Sign up</Link>
          </p>
        </>
      )}
    </div>
  );

  if (!user) return <AppShell courses={[]}>{page}</AppShell>;
  return <SignedInShell>{page}</SignedInShell>;
}
