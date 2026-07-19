import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { safeFolderCounts, safeListMessages } from "@/lib/mail-safe";
import type { Folder } from "@/lib/mail";

const folders = new Set(["inbox", "sent", "archive", "trash"]);

export async function GET(request: Request) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const folderParam = searchParams.get("folder") || "inbox";
  const query = searchParams.get("q") || undefined;

  if (!folders.has(folderParam)) {
    return NextResponse.json({ error: "Invalid folder" }, { status: 400 });
  }

  const [{ emails, error: listError }, { counts, error: countError }] =
    await Promise.all([
      safeListMessages(folderParam as Folder, query),
      safeFolderCounts(),
    ]);

  const error = listError || countError;
  if (error) {
    return NextResponse.json(
      { error: error.message, code: error.code, emails: [], counts },
      { status: 503 },
    );
  }

  return NextResponse.json({ emails, counts });
}
