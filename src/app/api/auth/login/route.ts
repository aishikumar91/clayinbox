import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getSession,
  mailboxPasswordConfigured,
  resolveSessionEmail,
  verifyMailboxPassword,
  verifyMailboxUsername,
} from "@/lib/auth";

const bodySchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const json = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 },
      );
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

    if (!verifyMailboxUsername(parsed.data.username)) {
      return NextResponse.json(
        {
          error:
            "Unknown username. Use info or info@clay-services.icu",
        },
        { status: 401 },
      );
    }

    if (!verifyMailboxPassword(parsed.data.password)) {
      return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
    }

    const session = await getSession();
    session.authenticated = true;
    session.email = resolveSessionEmail(parsed.data.username);
    await session.save();

    return NextResponse.json({
      ok: true,
      email: session.email,
      databaseConfigured: Boolean(process.env.DATABASE_URL),
    });
  } catch (error) {
    console.error("login failed", error);
    return NextResponse.json(
      {
        error:
          "Login failed while creating the session. Check SESSION_SECRET is set in Vercel.",
      },
      { status: 500 },
    );
  }
}
