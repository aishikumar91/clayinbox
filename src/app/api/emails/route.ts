import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { folderCounts, listMessages, type Folder } from "@/lib/mail";

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

  const emails = listMessages(folderParam as Folder, query);
  return NextResponse.json({ emails, counts: folderCounts() });
}
