import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import { timingSafeEqual } from "node:crypto";

export type SessionData = {
  authenticated?: boolean;
  email?: string;
};

const sessionOptions: SessionOptions = {
  password:
    process.env.SESSION_SECRET ||
    "emailbox-dev-secret-change-me-32chars-min!!",
  cookieName: "emailbox_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 14,
  },
};

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}

export async function requireSession() {
  const session = await getSession();
  if (!session.authenticated) {
    return null;
  }
  return session;
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) {
    return false;
  }
  return timingSafeEqual(left, right);
}

export function verifyMailboxPassword(password: string): boolean {
  const expected = process.env.MAILBOX_PASSWORD;
  if (!expected) {
    return false;
  }
  return safeEqual(password, expected);
}
