import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { getMessage, markRead, moveMessage, type Folder } from "@/lib/mail";

const patchSchema = z.object({
  read: z.boolean().optional(),
  folder: z.enum(["inbox", "sent", "archive", "trash"]).optional(),
});

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const email = getMessage(id);
  if (!email) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!email.read) {
    markRead(id, true);
    email.read = true;
  }

  return NextResponse.json({ email });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const email = getMessage(id);
  if (!email) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (typeof parsed.data.read === "boolean") {
    markRead(id, parsed.data.read);
  }
  if (parsed.data.folder) {
    moveMessage(id, parsed.data.folder as Folder);
  }

  return NextResponse.json({ email: getMessage(id) });
}
