import { headers } from "next/headers";
import { createHmac, randomBytes } from "node:crypto";
import { auth } from "@/lib/auth";
import { database } from "@/lib/database";
import type { Role } from "@/lib/identity-model";

export type Account = { id: string; email: string; name: string; role: Role; needsWelcome: boolean };

export function normalizeEmail(value: string) {
  const email = value.trim().toLowerCase();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

export async function currentAccount(): Promise<Account | null> {
  const session = await auth().api.getSession({ headers: await headers() });
  if (!session) return null;
  const result = await database().query<{ role: Role; onboarding_acknowledged_at: Date | null }>(
    "select role, onboarding_acknowledged_at from identity.profile where user_id = $1",
    [session.user.id],
  );
  const role = result.rows[0]?.role;
  if (role !== "instructor" && role !== "student") return null;
  return { id: session.user.id, email: session.user.email, name: session.user.name, role,
    needsWelcome: result.rows[0]?.onboarding_acknowledged_at === null };
}

export async function authenticateAccount(email: string, password: string, mode: "sign-in" | "sign-up", selectedRole?: Role, name?: string) {
  const normalized = normalizeEmail(email);
  if (!normalized || password.length < 10 || password.length > 128) return false;
  const db = database();
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("BETTER_AUTH_SECRET must have at least 32 characters");
  const emailKey = createHmac("sha256", secret).update(normalized).digest("hex");
  const attempt = await db.query<{ attempts: number }>(
    `insert into identity.login_attempt (email_key, started_at, attempts) values ($1, now(), 1)
     on conflict (email_key) do update set
       attempts = case when identity.login_attempt.started_at < now() - interval '15 minutes' then 1 else identity.login_attempt.attempts + 1 end,
       started_at = case when identity.login_attempt.started_at < now() - interval '15 minutes' then now() else identity.login_attempt.started_at end
     returning attempts`, [emailKey],
  );
  if ((attempt.rows[0]?.attempts ?? 100) > 10) return false;
  const found = await db.query<{ id: string }>('select id from public."user" where email = $1', [normalized]);
  if (mode === "sign-in" && !found.rowCount) return false;
  if (mode === "sign-up" && (found.rowCount || !selectedRole || !name?.trim() || name.trim().length > 100)) return false;
  try {
    if (mode === "sign-in") {
      await auth().api.signInEmail({ body: { email: normalized, password } });
      await db.query("delete from identity.login_attempt where email_key = $1", [emailKey]);
      return true;
    }
    const created = await auth().api.signUpEmail({
      body: { email: normalized, password, name: name!.trim() },
    });
    await db.query(
      "insert into identity.profile (user_id, role, vote_key) values ($1, $2, $3) on conflict (user_id) do nothing",
      [created.user.id, selectedRole, randomBytes(32).toString("hex")],
    );
    await db.query("delete from identity.login_attempt where email_key = $1", [emailKey]);
    return true;
  } catch {
    return false;
  }
}
