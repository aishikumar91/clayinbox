import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { safeListIdentities } from "@/lib/mail-safe";

export async function GET() {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { identities, error } = await safeListIdentities();
  if (error) {
    return NextResponse.json(
      { identities: [], error: error.message, code: error.code },
      { status: 503 },
    );
  }

  return NextResponse.json({ identities });
}
