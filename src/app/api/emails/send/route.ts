import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { MAIL_DOMAIN } from "@/lib/config";
import {
  getMessage,
  listIdentities,
  sanitizeBody,
  storeOutbound,
} from "@/lib/mail";
import { sendWithPlunk } from "@/lib/plunk";

const sendSchema = z.object({
  to: z.union([z.string().email(), z.array(z.string().email()).min(1)]),
  subject: z.string().min(1).max(998),
  body: z.string().min(1),
  from: z.string().email().optional(),
  replyToId: z.string().optional(),
});

export async function POST(request: Request) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = sendSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const identities = listIdentities();
  const fromEmail =
    parsed.data.from ||
    identities.find((i) => i.isDefault)?.email ||
    identities[0]?.email;

  if (!fromEmail || !fromEmail.endsWith(`@${MAIL_DOMAIN}`)) {
    return NextResponse.json(
      { error: `From address must be on @${MAIL_DOMAIN}` },
      { status: 400 },
    );
  }

  const identity = identities.find((i) => i.email === fromEmail);
  const toList = Array.isArray(parsed.data.to)
    ? parsed.data.to
    : [parsed.data.to];

  let subject = parsed.data.subject;
  let inReplyTo: string | undefined;
  if (parsed.data.replyToId) {
    const original = getMessage(parsed.data.replyToId);
    if (original) {
      inReplyTo = original.messageId || original.id;
      if (!/^re:/i.test(subject)) {
        subject = `Re: ${original.subject}`;
      }
    }
  }

  const { html } = sanitizeBody(parsed.data.body);
  const result = await sendWithPlunk(
    {
      to: toList.length === 1 ? toList[0] : toList,
      subject,
      body: html,
      from: {
        name: identity?.displayName || "Clay Services",
        email: fromEmail,
      },
      reply: fromEmail,
    },
    nanoid(),
  );

  if (!result.success) {
    return NextResponse.json(
      {
        error: result.error || "send_failed",
        message: result.message || "Failed to send via Plunk",
      },
      { status: 502 },
    );
  }

  const plunkEmailId = result.data?.emails?.[0]?.email;
  const stored = storeOutbound({
    fromEmail,
    fromName: identity?.displayName,
    to: toList,
    subject,
    bodyHtml: html,
    inReplyTo,
    plunkEmailId,
  });

  return NextResponse.json({ email: stored, plunk: result.data });
}
