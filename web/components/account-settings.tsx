import { changeAccountPassword, updateAccountDetails } from "@/lib/actions";

export function accountNotice(search: { error?: string; updated?: string }) {
  const errors: Record<string, string> = {
    name: "Enter a name of up to 100 characters.",
    email: "Enter a valid email address.",
    "email-taken": "That email is already used by another account.",
    "email-password": "Enter your current password to change your email.",
    password: "Could not change the password. Check your current password and choose a new one of at least 10 characters.",
    "password-match": "Passwords do not match. Please enter them again.",
  };
  const updates: Record<string, string> = {
    details: "Name and email saved.",
    password: "Password saved. Other signed-in devices will need the new password.",
    same: "Those details are already saved.",
  };
  if (search.error && errors[search.error]) return { kind: "error" as const, text: errors[search.error] };
  if (search.updated && updates[search.updated]) return { kind: "status" as const, text: updates[search.updated] };
  return null;
}

export function AccountSettings({ name, email, roleLabel, notice }: {
  name: string;
  email: string;
  roleLabel: string;
  notice: { kind: "error" | "status"; text: string } | null;
}) {
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Manage my account</h1>
          <p className="page-subtitle">Update the name, email, and password for this ClearCourse account.</p>
        </div>
      </div>
      {notice ? <p role={notice.kind === "error" ? "alert" : "status"}>{notice.text}</p> : null}
      <form className="panel panel-pad composer account-form" action={updateAccountDetails}>
        <h2>Name and email</h2>
        <div>
          <label htmlFor="account-name">Name</label>
          <input className="field" id="account-name" name="name" required maxLength={100} defaultValue={name} autoComplete="name" />
        </div>
        <div>
          <label htmlFor="account-email">Email</label>
          <input className="field" id="account-email" name="email" type="email" required maxLength={254} defaultValue={email} autoComplete="email" />
        </div>
        <p className="account-role-note">Role: {roleLabel}. This was chosen when the account was created.</p>
        <div>
          <label htmlFor="account-current-password">Current password</label>
          <input className="field" id="account-current-password" name="currentPassword" type="password" maxLength={128} autoComplete="current-password" />
          <small className="field-hint">Required if you change your email.</small>
        </div>
        <button className="button primary" type="submit">Save details</button>
      </form>
      <form className="panel panel-pad composer account-form" action={changeAccountPassword}>
        <h2>Password</h2>
        <div>
          <label htmlFor="password-current">Current password</label>
          <input className="field" id="password-current" name="currentPassword" type="password" required minLength={10} maxLength={128} autoComplete="current-password" />
        </div>
        <div>
          <label htmlFor="password-new">New password</label>
          <input className="field" id="password-new" name="password" type="password" required minLength={10} maxLength={128} autoComplete="new-password" />
        </div>
        <div>
          <label htmlFor="password-confirm">Confirm new password</label>
          <input className="field" id="password-confirm" name="confirmPassword" type="password" required minLength={10} maxLength={128} autoComplete="new-password" />
        </div>
        <button className="button primary" type="submit">Change password</button>
      </form>
    </div>
  );
}
