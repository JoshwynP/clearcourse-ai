import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { signUp } from "@/lib/actions";
import { currentAccount } from "@/lib/accounts";

export const dynamic = "force-dynamic";

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await currentAccount()) redirect("/");
  const { error } = await searchParams;
  return <AppShell courses={[]} crumb="Sign up"><div className="page">
    <div className="page-head"><div><h1>Sign up</h1>
      <p className="page-subtitle">Create a ClearCourse practice account.</p></div></div>
    {error ? <p role="alert">Could not create the account. Check your details, use a unique email, and choose a password of at least 10 characters.</p> : null}
    <form className="panel panel-pad composer" action={signUp}>
      <label htmlFor="signup-name">Name</label>
      <input className="field" id="signup-name" name="name" required maxLength={100} autoComplete="name" />
      <label htmlFor="signup-email">Email</label>
      <input className="field" id="signup-email" name="email" type="email" required maxLength={254} autoComplete="email" />
      <label htmlFor="signup-password">Password</label>
      <input className="field" id="signup-password" name="password" type="password" required minLength={10} maxLength={128} autoComplete="new-password" />
      <fieldset><legend>I am joining as</legend>
        <label><input type="radio" name="role" value="instructor" required /> Professor</label>
        <label><input type="radio" name="role" value="student" required /> Student</label>
      </fieldset>
      <p className="auth-note">Email ownership and Professor status are not verified. Use practice information only.</p>
      <button className="button primary" type="submit">Create account</button>
    </form>
    <p className="auth-switch">Already have an account? <Link href="/sign-in">Sign in</Link></p>
  </div></AppShell>;
}
