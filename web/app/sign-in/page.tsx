import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { signIn } from "@/lib/actions";
import { currentAccount } from "@/lib/accounts";

export const dynamic = "force-dynamic";

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await currentAccount()) redirect("/");
  const { error } = await searchParams;

  return (
    <AppShell courses={[]} crumb="Sign in">
      <div className="page">
        <div className="page-head">
          <div>
            <h1>Sign in</h1>
            <p className="page-subtitle">Enter your email and password. On your first visit, choose Student or Professor. Your choice and courses will be saved.</p>
          </div>
        </div>
        {error === "role" ? <p>Choose Professor or Student.</p> : null}
        {error === "credentials" ? <p>Could not sign in. Check your email and password. For a new account, choose a role and use a password of at least 10 characters.</p> : null}
        <form className="panel panel-pad composer" action={signIn}>
          <fieldset>
            <legend>Role for a new account</legend>
            <label>
              <input type="radio" name="role" value="instructor" /> Professor
            </label>
            <label>
              <input type="radio" name="role" value="student" /> Student
            </label>
          </fieldset>
          <label htmlFor="email">Email</label>
          <input className="field" id="email" name="email" type="email" required maxLength={254} autoComplete="email" />
          <label htmlFor="password">Password</label>
          <input className="field" id="password" name="password" type="password" required minLength={10} maxLength={128} autoComplete="current-password" />
          <p className="meta">Returning? Leave role blank; your saved role is used. A new email creates a practice account. Email ownership and Professor status are not verified.</p>
          <button className="button primary" type="submit">
            Sign in
          </button>
        </form>
      </div>
    </AppShell>
  );
}
