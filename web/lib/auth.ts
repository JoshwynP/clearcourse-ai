import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { database } from "@/lib/database";

function makeAuth() {
  const baseURL = process.env.VERCEL_ENV === "preview" && process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.BETTER_AUTH_URL;
  return betterAuth({
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL,
    database: database(),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 10,
      maxPasswordLength: 128,
      requireEmailVerification: false,
    },
    user: {
      changeEmail: {
        enabled: true,
        updateEmailWithoutVerification: true,
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
    },
    plugins: [nextCookies()],
  });
}

let instance: ReturnType<typeof makeAuth> | undefined;
export function auth() {
  return (instance ??= makeAuth());
}
