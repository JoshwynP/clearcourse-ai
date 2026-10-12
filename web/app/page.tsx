import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { SignedInShell } from "@/components/signed-in-shell";
import { createCourseAction, joinCourseAction } from "@/lib/actions";
import { coursesFor } from "@/lib/identity-model";
import { readIdentity } from "@/lib/identity-store";
import { currentUser } from "@/lib/session";

export default async function HomePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await currentUser();
  const { error } = await searchParams;
  const mine = user ? coursesFor(readIdentity(), user.id) : [];

  const page = (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Home</h1>
          <p className="page-subtitle">AI guidance, made clear</p>
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
            <form className="panel panel-pad composer" action={createCourseAction}>
              <h2>Create a course</h2>
              <label htmlFor="code">Course code</label>
              <input className="field" id="code" name="code" required maxLength={20} />
              <label htmlFor="course-name">Course name</label>
              <input className="field" id="course-name" name="name" required maxLength={80} />
              <button className="button primary" type="submit">
                Create course
              </button>
            </form>
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
          <p>This is not University of Waterloo sign-in.</p>
          <p className="home-actions">
            <Link className="button primary" href="/sign-in">
              Sign in
            </Link>
          </p>
        </>
      )}
    </div>
  );

  if (!user) return <AppShell courses={[]}>{page}</AppShell>;
  return <SignedInShell>{page}</SignedInShell>;
}
