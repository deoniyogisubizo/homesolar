import { cookies } from "next/headers";

export const SESSION_COOKIE = "sessionId";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

export async function readSessionId() {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}

export async function ensureSessionId() {
  const store = await cookies();
  const existing = store.get(SESSION_COOKIE)?.value;
  if (existing) return existing;

  const sessionId = crypto.randomUUID();
  store.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return sessionId;
}
