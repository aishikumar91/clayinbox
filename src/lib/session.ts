import type { SessionOptions } from "iron-session";

export type SessionData = {
  authenticated?: boolean;
  email?: string;
};

/**
 * iron-session requires a password of 32+ chars.
 * Edge-safe (no node:crypto) so middleware and Node route handlers share one key.
 */
export function sessionPassword(): string {
  const raw =
    process.env.SESSION_SECRET?.trim() ||
    process.env.MAILBOX_PASSWORD?.trim() ||
    "emailbox-dev-secret-change-me-32chars-min!!";

  if (raw.length >= 32) return raw;
  // Deterministic pad so short Vercel secrets still work.
  return `${raw}::emailbox-session-key-pad-32+`.padEnd(48, "x");
}

export function getSessionOptions(): SessionOptions {
  const isProd = process.env.NODE_ENV === "production";
  return {
    password: sessionPassword(),
    cookieName: "emailbox_session",
    cookieOptions: {
      secure: isProd,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 14,
    },
  };
}
