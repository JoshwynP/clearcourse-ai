import { headers } from "next/headers";
import { createHmac, randomBytes } from "node:crypto";
import { auth } from "@/lib/auth";
import { database } from "@/lib/database";
import type { Role } from "@/lib/identity-model";

export type Account = { id: string; email: string; name: string; role: Role };

export function normalizeEmail(value: string) {
  const email = value.trim().toLowerCase();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

export async function currentAccount(): Promise<Account | null> {
  const session = await auth().api.getSession({ headers: await headers() });
  if (!session) return null;
  const result = await database().query<{ role: Role }>(
    "select role from identity.profile where user_id = $1",
    [session.user.id],
  );
  const role = result.rows[0]?.role;
  if (role !== "instructor" && role !== "student") return null;
  return { id: session.user.id, email: session.user.email, name: session.user.name, role };
}

export async function signInOrCreate(email: string, password: string, selectedRole: Role) {
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
  try {
    if (found.rowCount) {
      await auth().api.signInEmail({ body: { email: normalized, password } });
      await db.query("delete from identity.login_attempt where email_key = $1", [emailKey]);
      return true;
    }
    const created = await auth().api.signUpEmail({
      body: { email: normalized, password, name: normalized.split("@")[0] },
    });
    await db.query(
      "insert into identity.profile (user_id, role, vote_key) values ($1, $2, $3) on conflict (user_id) do nothing",
      [created.user.id, selectedRole, randomBytes(32).toString("hex")],
    );
    await db.query("delete from identity.login_attempt where email_key = $1", [emailKey]);
    return true;
  } catch {
    // A simultaneous first sign-in may win the unique email constraint.
    // Only a correct password may enter that existing account.
    try {
      await auth().api.signInEmail({ body: { email: normalized, password } });
      const row = await db.query("select user_id from identity.profile where user_id = (select id from public.\"user\" where email = $1)", [normalized]);
      if (!row.rowCount) {
        const user = await db.query<{ id: string }>('select id from public."user" where email = $1', [normalized]);
        if (user.rows[0]) await db.query("insert into identity.profile (user_id, role, vote_key) values ($1, $2, $3) on conflict (user_id) do nothing", [user.rows[0].id, selectedRole, randomBytes(32).toString("hex")]);
      }
      await db.query("delete from identity.login_attempt where email_key = $1", [emailKey]);
      return true;
    } catch {
      return false;
    }
  }
}
