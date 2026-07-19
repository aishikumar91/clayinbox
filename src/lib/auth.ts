import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { createHash, timingSafeEqual } from "node:crypto";
import { getSessionOptions, type SessionData } from "./session";

export type { SessionData };

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), getSessionOptions());
}

export async function requireSession() {
  const session = await getSession();
  if (!session.authenticated) {
    return null;
  }
  return session;
}

/** Compare passwords by hashing both sides so length differences don't leak. */
export function verifyMailboxPassword(password: string): boolean {
  const expected = process.env.MAILBOX_PASSWORD;
  if (!expected) {
    return false;
  }
  const left = createHash("sha256").update(password).digest();
  const right = createHash("sha256").update(expected).digest();
  return timingSafeEqual(left, right);
}

export function mailboxPasswordConfigured(): boolean {
  return Boolean(process.env.MAILBOX_PASSWORD);
}
