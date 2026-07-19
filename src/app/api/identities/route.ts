import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { listIdentities } from "@/lib/mail";

export async function GET() {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ identities: listIdentities() });
}
