import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getSession,
  mailboxPasswordConfigured,
  verifyMailboxPassword,
} from "@/lib/auth";
import { DEFAULT_FROM } from "@/lib/config";

const bodySchema = z.object({
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const json = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    if (!mailboxPasswordConfigured()) {
      return NextResponse.json(
        {
          error:
            "MAILBOX_PASSWORD is not set in Vercel Environment Variables. Add it, then redeploy.",
        },
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

    return NextResponse.json({
      ok: true,
      email: DEFAULT_FROM,
      databaseConfigured: Boolean(process.env.DATABASE_URL),
    });
  } catch (error) {
    console.error("login failed", error);
    return NextResponse.json(
      {
        error:
          "Login failed while creating the session. Check SESSION_SECRET is set in Vercel (any string works).",
      },
      { status: 500 },
    );
  }
}
