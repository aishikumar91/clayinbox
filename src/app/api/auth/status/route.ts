import { NextResponse } from "next/server";
import { mailboxPasswordConfigured, requireSession } from "@/lib/auth";

export async function GET() {
  const session = await requireSession();
  return NextResponse.json({
    authenticated: Boolean(session?.authenticated),
    email: session?.email ?? null,
    mailboxPasswordConfigured: mailboxPasswordConfigured(),
    databaseConfigured: Boolean(process.env.DATABASE_URL),
    plunkConfigured: Boolean(process.env.PLUNK_SECRET_KEY),
  });
}
