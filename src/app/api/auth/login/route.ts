import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, verifyMailboxPassword } from "@/lib/auth";
import { DEFAULT_FROM } from "@/lib/config";

const bodySchema = z.object({
  password: z.string().min(1),
});

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!process.env.MAILBOX_PASSWORD) {
    return NextResponse.json(
      { error: "MAILBOX_PASSWORD is not configured on the server" },
      { status: 503 },
    );
  }

  if (!verifyMailboxPassword(parsed.data.password)) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  const session = await getSession();
  session.authenticated = true;
  session.email = DEFAULT_FROM;
  await session.save();

  return NextResponse.json({ ok: true });
}
