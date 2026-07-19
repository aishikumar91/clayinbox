"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, ArrowLeft, Reply, Trash2 } from "lucide-react";
import { formatFullDate, parseJsonAddresses } from "@/lib/format";
import type { Message } from "@/lib/schema";

export function MessageView({
  email,
  folder,
}: {
  email: Message;
  folder: string;
}) {
  const router = useRouter();
  const to = parseJsonAddresses(email.toAddresses);

  async function patch(body: Record<string, unknown>) {
    await fetch(`/api/emails/${email.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    router.push(`/${folder === "trash" || folder === "archive" ? "inbox" : folder}`);
    router.refresh();
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 md:px-7">
        <Link
          href={`/${folder}`}
          className="inline-flex items-center gap-2 text-sm text-ink-soft transition hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/compose?replyTo=${email.id}`}
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-white transition hover:bg-accent-deep"
          >
            <Reply className="h-4 w-4" />
            Reply
          </Link>
          <button
            type="button"
            onClick={() => patch({ folder: "archive" })}
            className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink-soft transition hover:text-ink"
          >
            <Archive className="h-4 w-4" />
            Archive
          </button>
          <button
            type="button"
            onClick={() => patch({ folder: "trash" })}
            className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-3 py-2 text-sm text-danger transition hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
            Trash
          </button>
        </div>
      </header>

      <article className="animate-rise min-h-0 flex-1 overflow-y-auto px-5 py-6 md:px-7">
        <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-tight text-ink md:text-4xl">
          {email.subject}
        </h1>
        <div className="mt-5 grid gap-2 rounded-2xl border border-line bg-panel/50 p-4 text-sm">
          <p>
            <span className="text-ink-soft">From</span>{" "}
            <strong>
              {email.fromName ? `${email.fromName} ` : ""}
              &lt;{email.fromAddress}&gt;
            </strong>
          </p>
          <p>
            <span className="text-ink-soft">To</span>{" "}
            <strong>{to.join(", ")}</strong>
          </p>
          <p>
            <span className="text-ink-soft">Date</span>{" "}
            <strong>{formatFullDate(email.receivedAt)}</strong>
          </p>
          {(email.spamVerdict || email.spfVerdict) && (
            <p className="text-xs text-ink-soft">
              Verdicts · spam {email.spamVerdict || "n/a"} · spf{" "}
              {email.spfVerdict || "n/a"} · dkim {email.dkimVerdict || "n/a"} ·
              dmarc {email.dmarcVerdict || "n/a"}
            </p>
          )}
        </div>

        <div
          className="email-body mt-8 max-w-3xl"
          dangerouslySetInnerHTML={{
            __html: email.bodyHtml || `<p>${email.bodyText || ""}</p>`,
          }}
        />
      </article>
    </div>
  );
}
