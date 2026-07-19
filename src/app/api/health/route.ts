import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { identities } from "@/lib/schema";

export async function GET() {
  const databaseUrl = process.env.DATABASE_URL?.trim() || "";
  const plunkKey = process.env.PLUNK_SECRET_KEY?.trim() || "";
  const mailboxPassword = process.env.MAILBOX_PASSWORD?.trim() || "";
  const domain = process.env.MAIL_DOMAIN || "clay-services.icu";

  let databaseConnected = false;
  let tablesOk = false;
  let databaseError: string | null = null;

  if (databaseUrl) {
    try {
      const db = getDb();
      await db.select({ id: identities.id }).from(identities).limit(1);
      databaseConnected = true;
      tablesOk = true;
    } catch (error) {
      databaseError =
        error instanceof Error ? error.message.slice(0, 200) : "db_error";
    }
  }

  return NextResponse.json({
    ok: true,
    service: "emailbox",
    domain,
    defaultFrom: process.env.DEFAULT_FROM_EMAIL || `info@${domain}`,
    plunkApiUrl: process.env.PLUNK_API_URL || "https://next-api.useplunk.com",
    databaseConfigured: Boolean(databaseUrl),
    databaseConnected,
    tablesOk,
    databaseError,
    plunkConfigured: Boolean(plunkKey),
    mailboxPasswordConfigured: Boolean(mailboxPassword),
  });
}
