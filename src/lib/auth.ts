import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { createHash, timingSafeEqual } from "node:crypto";
import { DEFAULT_FROM, MAIL_DOMAIN } from "./config";
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

function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

/** Accepted mailbox usernames: info, info@domain, or MAILBOX_USERNAME. */
export function verifyMailboxUsername(username: string): boolean {
  const input = normalizeUsername(username);
  if (!input) return false;

  const configured = process.env.MAILBOX_USERNAME?.trim().toLowerCase();
  const allowed = new Set<string>([
    "info",
    `info@${MAIL_DOMAIN}`,
    DEFAULT_FROM.toLowerCase(),
    "admin",
    `admin@${MAIL_DOMAIN}`,
  ]);
  if (configured) {
    allowed.add(configured);
    if (!configured.includes("@")) {
      allowed.add(`${configured}@${MAIL_DOMAIN}`);
    }
  }

  return allowed.has(input);
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

export function resolveSessionEmail(username: string): string {
  const input = normalizeUsername(username);
  if (input.includes("@")) return input;
  return `${input}@${MAIL_DOMAIN}`;
}
