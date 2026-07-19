import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "emailbox",
    domain: process.env.MAIL_DOMAIN || "clay-services.icu",
    databaseConfigured: Boolean(process.env.DATABASE_URL),
    plunkConfigured: Boolean(process.env.PLUNK_SECRET_KEY),
    mailboxPasswordConfigured: Boolean(process.env.MAILBOX_PASSWORD),
  });
}
