import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { storeInbound, type InboundPayload } from "@/lib/mail";

function authorized(request: Request): boolean {
  const secret = process.env.PLUNK_WEBHOOK_SECRET;
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }

  const header =
    request.headers.get("x-emailbox-secret") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!header) return false;
  const left = Buffer.from(header);
  const right = Buffer.from(secret);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as InboundPayload | null;
  if (!payload) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email = await storeInbound(payload);
  return NextResponse.json({ ok: true, id: email.id });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "emailbox-plunk-webhook",
    hint: "Configure a Plunk workflow on email.received to POST inbound payloads here.",
  });
}
