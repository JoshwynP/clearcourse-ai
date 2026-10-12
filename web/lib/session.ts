import { cookies } from "next/headers";
import { userForSession, type UserRecord } from "@/lib/identity-model";
import { readIdentity } from "@/lib/identity-store";

const cookieName = "cc_session";

export async function currentUser(): Promise<UserRecord | undefined> {
  const jar = await cookies();
  const sessionId = jar.get(cookieName)?.value;
  if (!sessionId) return undefined;
  return userForSession(readIdentity(), sessionId);
}

export async function setSessionCookie(sessionId: string) {
  const jar = await cookies();
  jar.set(cookieName, sessionId, { httpOnly: true, sameSite: "lax", path: "/" });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(cookieName);
}

export async function sessionId() {
  const jar = await cookies();
  return jar.get(cookieName)?.value;
}
