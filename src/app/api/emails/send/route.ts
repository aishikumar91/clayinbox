import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { DEFAULT_FROM, MAIL_DOMAIN, PLUNK_API_URL } from "@/lib/config";
import {
  getMessage,
  listIdentities,
  sanitizeBody,
  storeOutbound,
} from "@/lib/mail";
import { sendWithPlunk } from "@/lib/plunk";

const emailSchema = z
  .string()
  .trim()
  .email("Enter a valid email address");

const sendSchema = z.object({
  to: z.union([emailSchema, z.array(emailSchema).min(1)]),
  subject: z.string().trim().min(1).max(998),
  body: z.string().min(1),
  from: emailSchema.optional(),
  replyToId: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = sendSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid request",
          message:
            parsed.error.issues[0]?.message ||
            "Check the To, Subject, and Message fields",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    let identities: Awaited<ReturnType<typeof listIdentities>> = [];
    try {
      identities = await listIdentities();
    } catch (identityError) {
      console.error("listIdentities failed during send", identityError);
    }

    const fromEmail = (
      parsed.data.from ||
      identities.find((i) => i.isDefault)?.email ||
      DEFAULT_FROM ||
      identities[0]?.email ||
      ""
    )
      .trim()
      .toLowerCase();

    if (!fromEmail || !fromEmail.endsWith(`@${MAIL_DOMAIN}`)) {
      return NextResponse.json(
        {
          error: "invalid_from",
          message: `From address must be on @${MAIL_DOMAIN}`,
        },
        { status: 400 },
      );
    }

    const identity = identities.find((i) => i.email === fromEmail);
    const toList = (
      Array.isArray(parsed.data.to) ? parsed.data.to : [parsed.data.to]
    ).map((address) => address.trim().toLowerCase());

    let subject = parsed.data.subject;
    let inReplyTo: string | undefined;
    if (parsed.data.replyToId) {
      try {
        const original = await getMessage(parsed.data.replyToId);
        if (original) {
          inReplyTo = original.messageId || original.id;
          if (!/^re:/i.test(subject)) {
            subject = `Re: ${original.subject}`;
          }
        }
      } catch (replyError) {
        console.error("reply lookup failed", replyError);
      }
    }

    const { html } = sanitizeBody(parsed.data.body);
    if (!html.trim()) {
      return NextResponse.json(
        { error: "empty_body", message: "Message body is empty" },
        { status: 400 },
      );
    }

    const result = await sendWithPlunk(
      {
        to: toList.length === 1 ? toList[0] : toList,
        subject,
        body: html,
        // Plunk accepts string or {name,email}; string is the most reliable path.
        from: fromEmail,
        reply: fromEmail,
      },
      nanoid(),
    );

    if (!result.success) {
      console.error("plunk send failed", {
        api: PLUNK_API_URL,
        from: fromEmail,
        to: toList,
        error: result.error,
        message: result.message,
      });
      return NextResponse.json(
        {
          error: result.error || "send_failed",
          message: result.message || "Failed to send via Plunk",
        },
        { status: 502 },
      );
    }

    const plunkEmailId = result.data?.emails?.[0]?.email;
    try {
      const stored = await storeOutbound({
        fromEmail,
        fromName: identity?.displayName,
        to: toList,
        subject,
        bodyHtml: html,
        inReplyTo,
        plunkEmailId,
      });
      return NextResponse.json({ email: stored, plunk: result.data });
    } catch (storeError) {
      console.error("outbound store failed after plunk send", storeError);
      // Email already left Plunk — don't fail the user action.
      return NextResponse.json({
        email: {
          id: plunkEmailId || nanoid(),
          subject,
          fromAddress: fromEmail,
          toAddresses: JSON.stringify(toList),
          folder: "sent",
        },
        plunk: result.data,
        warning: "Email sent via Plunk, but saving to Sent folder failed",
      });
    }
  } catch (error) {
    console.error("send route crashed", error);
    return NextResponse.json(
      {
        error: "send_crashed",
        message:
          error instanceof Error
            ? error.message
            : "Unexpected error while sending email",
      },
      { status: 500 },
    );
  }
}
