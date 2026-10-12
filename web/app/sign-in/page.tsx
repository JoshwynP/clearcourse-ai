import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { signIn } from "@/lib/actions";
import { currentUser } from "@/lib/session";

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await currentUser()) redirect("/");
  const { error } = await searchParams;

  return (
    <AppShell courses={[]} crumb="Sign in">
      <div className="page">
        <div className="page-head">
          <div>
            <h1>Sign in</h1>
            <p className="page-subtitle">Choose Professor or Student, then enter your name. Use the same name and role to return to your courses. This is not University of Waterloo sign-in.</p>
          </div>
        </div>
        {error === "role" ? <p>Choose Professor or Student.</p> : null}
        {error === "name" ? <p>Enter your name.</p> : null}
        <form className="panel panel-pad composer" action={signIn}>
          <fieldset>
            <legend>Role</legend>
            <label>
              <input type="radio" name="role" value="instructor" required /> Professor
            </label>
            <label>
              <input type="radio" name="role" value="student" /> Student
            </label>
          </fieldset>
          <label htmlFor="name">Name</label>
          <input className="field" id="name" name="name" required maxLength={80} autoComplete="name" />
          <button className="button primary" type="submit">
            Sign in
          </button>
        </form>
      </div>
    </AppShell>
  );
}
