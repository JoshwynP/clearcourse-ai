import { redirect } from "next/navigation";
import Link from "next/link";
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
            <p className="page-subtitle">Use the email and password for your ClearCourse practice account.</p>
          </div>
        </div>
        {error === "credentials" ? <p role="alert">Could not sign in. Check your email and password.</p> : null}
        <form className="panel panel-pad composer" action={signIn}>
          <label htmlFor="email">Email</label>
          <input className="field" id="email" name="email" type="email" required maxLength={254} autoComplete="email" />
          <label htmlFor="password">Password</label>
          <input className="field" id="password" name="password" type="password" required minLength={10} maxLength={128} autoComplete="current-password" />
          <button className="button primary" type="submit">
            Sign in
          </button>
        </form>
        <p className="auth-switch">New here? <Link href="/sign-up">Create an account</Link></p>
      </div>
    </AppShell>
  );
}
