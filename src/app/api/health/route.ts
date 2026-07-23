import { NextResponse } from "next/server";
import { PLUNK_API_URL } from "@/lib/config";
import { getDb } from "@/lib/db";
import { inspectPlunkSecretKey } from "@/lib/plunk";
import { identities } from "@/lib/schema";

export async function GET() {
  const databaseUrl = process.env.DATABASE_URL?.trim() || "";
  const plunkKeyInfo = inspectPlunkSecretKey(process.env.PLUNK_SECRET_KEY);
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
    plunkApiUrl: PLUNK_API_URL,
    databaseConfigured: Boolean(databaseUrl),
    databaseConnected,
    tablesOk,
    databaseError,
    plunkConfigured: plunkKeyInfo.configured,
    plunkKeyKind: plunkKeyInfo.kind,
    mailboxPasswordConfigured: Boolean(mailboxPassword),
  });
}
