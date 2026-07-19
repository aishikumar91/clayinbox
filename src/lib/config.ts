export const MAIL_DOMAIN = process.env.MAIL_DOMAIN || "clay-services.icu";
export const PLUNK_API_URL =
  process.env.PLUNK_API_URL || "https://next-api.useplunk.com";
export const DEFAULT_FROM =
  process.env.DEFAULT_FROM_EMAIL || `info@${MAIL_DOMAIN}`;
export const APP_NAME = process.env.APP_NAME || "Clay Inbox";
export const APP_URL =
  process.env.APP_URL || "https://clayinbox.vercel.app";

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}
