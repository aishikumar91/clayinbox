"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Identity, Message } from "@/lib/schema";

export function ComposeForm({
  identities,
  replyTo,
}: {
  identities: Identity[];
  replyTo?: Message | null;
}) {
  const router = useRouter();
  const defaultFrom =
    identities.find((item) => item.isDefault)?.email || identities[0]?.email || "";
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(replyTo?.fromAddress || "");
  const [subject, setSubject] = useState(
    replyTo ? (replyTo.subject.match(/^re:/i) ? replyTo.subject : `Re: ${replyTo.subject}`) : "",
  );
  const [body, setBody] = useState(
    replyTo
      ? `\n\n---\nOn ${replyTo.receivedAt}, ${replyTo.fromAddress} wrote:\n${replyTo.bodyText || ""}`
      : "",
  );
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSending(true);
    setError(null);

    const response = await fetch("/api/emails/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: to
          .split(",")
          .map((part) => part.trim())
          .filter(Boolean),
        subject,
        body: body.replace(/\n/g, "<br />"),
        replyToId: replyTo?.id,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    setSending(false);

    if (!response.ok) {
      setError(payload.message || payload.error || "Failed to send email");
      return;
    }

    router.push("/sent");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex h-full min-h-0 flex-col">
      <header className="border-b border-line px-5 py-5 md:px-7">
        <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-tight text-ink">
          Compose
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Sends through Plunk from your verified clay-services.icu domain.
        </p>
      </header>

      <div className="animate-rise min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-6 md:px-7">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold tracking-wide text-ink-soft uppercase">
            From
          </span>
          <select
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            className="w-full rounded-2xl border border-line bg-white px-3 py-2.5 text-sm outline-none ring-accent/30 focus:ring-2"
          >
            {identities.map((identity) => (
              <option key={identity.id} value={identity.email}>
                {identity.displayName} &lt;{identity.email}&gt;
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold tracking-wide text-ink-soft uppercase">
            To
          </span>
          <input
            required
            value={to}
            onChange={(event) => setTo(event.target.value)}
            placeholder="recipient@example.com"
            className="w-full rounded-2xl border border-line bg-white px-3 py-2.5 text-sm outline-none ring-accent/30 focus:ring-2"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold tracking-wide text-ink-soft uppercase">
            Subject
          </span>
          <input
            required
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            className="w-full rounded-2xl border border-line bg-white px-3 py-2.5 text-sm outline-none ring-accent/30 focus:ring-2"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold tracking-wide text-ink-soft uppercase">
            Message
          </span>
          <textarea
            required
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={14}
            className="w-full resize-y rounded-2xl border border-line bg-white px-3 py-3 text-sm leading-6 outline-none ring-accent/30 focus:ring-2"
          />
        </label>

        {error ? (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        ) : null}
      </div>

      <footer className="border-t border-line px-5 py-4 md:px-7">
        <button
          type="submit"
          disabled={sending}
          className="rounded-2xl bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-accent-deep disabled:opacity-60"
        >
          {sending ? "Sending…" : "Send with Plunk"}
        </button>
      </footer>
    </form>
  );
}
