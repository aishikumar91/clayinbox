export const MAIL_DOMAIN = process.env.MAIL_DOMAIN || "clay-services.icu";

/**
 * Plunk's current public API host is next-api.useplunk.com.
 * Legacy api.useplunk.com rejects modern sk_ keys with 401.
 */
function resolvePlunkApiUrl(): string {
  const raw = (process.env.PLUNK_API_URL || "https://next-api.useplunk.com")
    .trim()
    .replace(/\/$/, "");

  if (
    !raw ||
    raw.includes("api.useplunk.com") && !raw.includes("next-api.useplunk.com")
  ) {
    return "https://next-api.useplunk.com";
  }

  return raw;
}

export const PLUNK_API_URL = resolvePlunkApiUrl();
export const DEFAULT_FROM =
  process.env.DEFAULT_FROM_EMAIL || `info@${MAIL_DOMAIN}`;
export const APP_NAME = process.env.APP_NAME || "Clay Inbox";
export const APP_URL =
  process.env.APP_URL || "https://clayinbox.vercel.app";

export function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}
