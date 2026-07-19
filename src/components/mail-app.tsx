"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Archive,
  Inbox,
  LoaderCircle,
  LogOut,
  MailPlus,
  Pencil,
  RefreshCw,
  Reply,
  Search,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { formatFullDate, formatMailboxDate, parseJsonAddresses } from "@/lib/format";
import type { Identity, Message } from "@/lib/schema";

type Folder = "inbox" | "sent" | "archive" | "trash";
type Counts = Record<string, { total: number; unread: number }>;

const folders: Array<{
  id: Folder;
  label: string;
  icon: typeof Inbox;
}> = [
  { id: "inbox", label: "Inbox", icon: Inbox },
  { id: "sent", label: "Sent", icon: Send },
  { id: "archive", label: "Archive", icon: Archive },
  { id: "trash", label: "Trash", icon: Trash2 },
];

export function MailApp({
  appName,
  domain,
  initialFolder = "inbox",
}: {
  appName: string;
  domain: string;
  initialFolder?: Folder;
}) {
  const router = useRouter();
  const [folder, setFolder] = useState<Folder>(initialFolder);
  const [emails, setEmails] = useState<Message[]>([]);
  const [counts, setCounts] = useState<Counts>({});
  const [identities, setIdentities] = useState<Identity[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);

  const selected = useMemo(
    () => emails.find((email) => email.id === selectedId) || null,
    [emails, selectedId],
  );

  const load = useCallback(async (nextFolder: Folder, nextQuery = "") => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ folder: nextFolder });
      if (nextQuery.trim()) params.set("q", nextQuery.trim());
      const [mailRes, idRes] = await Promise.all([
        fetch(`/api/emails?${params.toString()}`),
        fetch("/api/identities"),
      ]);
      const mailJson = await mailRes.json().catch(() => ({}));
      const idJson = await idRes.json().catch(() => ({}));

      if (!mailRes.ok) {
        throw new Error(mailJson.error || mailJson.message || "Failed to load mailbox");
      }

      setEmails(mailJson.emails || []);
      setCounts(mailJson.counts || {});
      if (idRes.ok) setIdentities(idJson.identities || []);
      setSelectedId((current) => {
        const list: Message[] = mailJson.emails || [];
        if (current && list.some((item) => item.id === current)) return current;
        return list[0]?.id ?? null;
      });
    } catch (err) {
      setEmails([]);
      setError(err instanceof Error ? err.message : "Failed to load mailbox");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ folder });
        const [mailRes, idRes] = await Promise.all([
          fetch(`/api/emails?${params.toString()}`),
          fetch("/api/identities"),
        ]);
        if (cancelled) return;
        const mailJson = await mailRes.json().catch(() => ({}));
        const idJson = await idRes.json().catch(() => ({}));
        if (!mailRes.ok) {
          throw new Error(
            mailJson.error || mailJson.message || "Failed to load mailbox",
          );
        }
        setEmails(mailJson.emails || []);
        setCounts(mailJson.counts || {});
        if (idRes.ok) setIdentities(idJson.identities || []);
        setSelectedId((current) => {
          const list: Message[] = mailJson.emails || [];
          if (current && list.some((item) => item.id === current)) return current;
          return list[0]?.id ?? null;
        });
      } catch (err) {
        if (!cancelled) {
          setEmails([]);
          setError(err instanceof Error ? err.message : "Failed to load mailbox");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [folder]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  async function patchSelected(body: Record<string, unknown>) {
    if (!selected) return;
    const response = await fetch(`/api/emails/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) return;
    await load(folder, query);
  }

  function openCompose(message?: Message | null) {
    setReplyTo(message || null);
    setComposeOpen(true);
  }

  return (
    <div className="mail-shell">
      <aside className="mail-sidebar">
        <div className="animate-rise">
          <p className="font-[family-name:var(--font-display)] text-3xl tracking-tight text-ink">
            {appName}
          </p>
          <p className="mt-1 text-sm text-ink-soft">@{domain}</p>
          <p className="mt-3 text-xs uppercase tracking-[0.18em] text-ink-soft">
            Plunk inbound + outbound
          </p>
        </div>

        <button
          type="button"
          onClick={() => openCompose(null)}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:bg-accent-deep"
        >
          <MailPlus className="h-4 w-4" />
          Compose
        </button>

        <nav className="mt-5 flex gap-2 overflow-x-auto pb-1 md:flex-col md:overflow-visible">
          {folders.map((item) => {
            const Icon = item.icon;
            const active = folder === item.id;
            const unread = counts[item.id]?.unread || 0;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setFolder(item.id);
                  setSelectedId(null);
                }}
                className={`inline-flex min-w-[7.5rem] items-center justify-between gap-3 rounded-2xl px-3 py-2.5 text-left text-sm transition md:min-w-0 ${
                  active
                    ? "bg-accent-soft text-accent-deep"
                    : "text-ink-soft hover:bg-white/70 hover:text-ink"
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  {item.label}
                </span>
                {unread > 0 ? (
                  <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-white">
                    {unread}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto hidden pt-8 md:block">
          <button
            type="button"
            onClick={() => void load(folder, query)}
            className="inline-flex items-center gap-2 text-sm text-ink-soft transition hover:text-ink"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button
            type="button"
            onClick={logout}
            className="mt-3 flex items-center gap-2 text-sm text-ink-soft transition hover:text-ink"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      <section className="mail-list-pane">
        <header className="border-b border-line px-4 py-4 md:px-5">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h1 className="font-[family-name:var(--font-display)] text-2xl tracking-tight capitalize">
                {folder}
              </h1>
              <p className="text-xs text-ink-soft">
                {emails.length} message{emails.length === 1 ? "" : "s"}
              </p>
            </div>
            <button
              type="button"
              className="rounded-xl border border-line bg-white p-2 text-ink-soft md:hidden"
              onClick={() => void load(folder, query)}
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
          <label className="relative mt-3 block">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-soft" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void load(folder, query);
              }}
              placeholder="Search subject, sender, preview"
              className="w-full rounded-2xl border border-line bg-white/90 py-2.5 pr-3 pl-10 text-sm outline-none ring-accent/30 focus:ring-2"
            />
          </label>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex h-40 items-center justify-center text-ink-soft">
              <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
              Loading mailbox…
            </div>
          ) : error ? (
            <div className="m-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-warn">
              <p className="font-semibold">Mailbox unavailable</p>
              <p className="mt-1">{error}</p>
              <p className="mt-3 text-ink-soft">
                Set <code>DATABASE_URL</code> (Supabase pooler) and run the SQL
                migration, then refresh.
              </p>
            </div>
          ) : emails.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center px-6 py-16 text-center">
              <p className="font-[family-name:var(--font-display)] text-2xl">
                {folder === "inbox" ? "Inbox zero" : "Nothing here"}
              </p>
              <p className="mt-2 max-w-sm text-sm text-ink-soft">
                {folder === "inbox"
                  ? "New mail arrives when Plunk posts to /api/webhooks/plunk."
                  : "Messages you move or send will show up in this folder."}
              </p>
              <button
                type="button"
                onClick={() => openCompose(null)}
                className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-accent px-4 py-2.5 text-sm font-semibold text-white"
              >
                <Pencil className="h-4 w-4" />
                Write an email
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {emails.map((email) => {
                const active = email.id === selectedId;
                const counterpart =
                  folder === "sent"
                    ? parseJsonAddresses(email.toAddresses).join(", ")
                    : email.fromName || email.fromAddress;
                return (
                  <li key={email.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(email.id)}
                      className={`grid w-full grid-cols-[1fr_auto] gap-2 px-4 py-3 text-left transition md:px-5 ${
                        active
                          ? "bg-accent-soft/70"
                          : email.read
                            ? "hover:bg-panel/60"
                            : "bg-accent-soft/20 hover:bg-accent-soft/40"
                      }`}
                    >
                      <div className="min-w-0">
                        <p
                          className={`truncate text-sm ${
                            email.read ? "text-ink-soft" : "font-semibold text-ink"
                          }`}
                        >
                          {counterpart}
                        </p>
                        <p
                          className={`truncate text-sm ${
                            email.read ? "text-ink-soft" : "font-medium text-ink"
                          }`}
                        >
                          {email.subject}
                        </p>
                        <p className="truncate text-xs text-ink-soft">
                          {email.preview || "No preview"}
                        </p>
                      </div>
                      <span className="text-xs text-ink-soft">
                        {formatMailboxDate(email.receivedAt)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      <section className="mail-reader-pane">
        {!selected ? (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <p className="font-[family-name:var(--font-display)] text-3xl">
              Clay Inbox
            </p>
            <p className="mt-2 max-w-md text-sm text-ink-soft">
              Full webmail for @{domain}. Select a message or compose a new one —
              outbound goes through Plunk, inbound lands via webhook.
            </p>
          </div>
        ) : (
          <>
            <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-4">
              <div className="min-w-0">
                <h2 className="truncate font-[family-name:var(--font-display)] text-2xl tracking-tight md:text-3xl">
                  {selected.subject}
                </h2>
                <p className="mt-1 text-xs text-ink-soft">
                  {formatFullDate(selected.receivedAt)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => openCompose(selected)}
                  className="inline-flex items-center gap-2 rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-white"
                >
                  <Reply className="h-4 w-4" />
                  Reply
                </button>
                <button
                  type="button"
                  onClick={() => void patchSelected({ folder: "archive" })}
                  className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink-soft"
                >
                  <Archive className="h-4 w-4" />
                  Archive
                </button>
                <button
                  type="button"
                  onClick={() => void patchSelected({ folder: "trash" })}
                  className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-3 py-2 text-sm text-danger"
                >
                  <Trash2 className="h-4 w-4" />
                  Trash
                </button>
              </div>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
              <div className="rounded-2xl border border-line bg-panel/40 p-4 text-sm">
                <p>
                  <span className="text-ink-soft">From</span>{" "}
                  <strong>
                    {selected.fromName ? `${selected.fromName} ` : ""}
                    &lt;{selected.fromAddress}&gt;
                  </strong>
                </p>
                <p className="mt-1">
                  <span className="text-ink-soft">To</span>{" "}
                  <strong>
                    {parseJsonAddresses(selected.toAddresses).join(", ")}
                  </strong>
                </p>
              </div>
              <div
                className="email-body mt-6 max-w-3xl"
                dangerouslySetInnerHTML={{
                  __html:
                    selected.bodyHtml ||
                    `<p>${selected.bodyText || ""}</p>`,
                }}
              />
            </div>
          </>
        )}
      </section>

      {composeOpen ? (
        <ComposeModal
          identities={identities}
          domain={domain}
          replyTo={replyTo}
          onClose={() => {
            setComposeOpen(false);
            setReplyTo(null);
          }}
          onSent={async () => {
            setComposeOpen(false);
            setReplyTo(null);
            setFolder("sent");
            await load("sent", "");
          }}
        />
      ) : null}
    </div>
  );
}

function ComposeModal({
  identities,
  domain,
  replyTo,
  onClose,
  onSent,
}: {
  identities: Identity[];
  domain: string;
  replyTo: Message | null;
  onClose: () => void;
  onSent: () => Promise<void>;
}) {
  const defaultFrom =
    identities.find((item) => item.isDefault)?.email ||
    identities[0]?.email ||
    `hello@${domain}`;
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(replyTo?.fromAddress || "");
  const [subject, setSubject] = useState(
    replyTo
      ? replyTo.subject.match(/^re:/i)
        ? replyTo.subject
        : `Re: ${replyTo.subject}`
      : "",
  );
  const [body, setBody] = useState(
    replyTo
      ? `\n\n---\nOn ${replyTo.receivedAt}, ${replyTo.fromAddress} wrote:\n${replyTo.bodyText || ""}`
      : "",
  );
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
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
      setError(payload.message || payload.error || "Send failed");
      return;
    }
    await onSent();
  }

  return (
    <div className="mail-compose-overlay animate-fade">
      <form onSubmit={submit} className="mail-compose-panel animate-rise">
        <header className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl">
              {replyTo ? "Reply" : "New message"}
            </h2>
            <p className="text-xs text-ink-soft">Sends through Plunk</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-line bg-white p-2 text-ink-soft"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="space-y-3 px-5 py-4">
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-semibold tracking-wide text-ink-soft uppercase">
              From
            </span>
            <select
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className="w-full rounded-2xl border border-line bg-white px-3 py-2.5 outline-none ring-accent/30 focus:ring-2"
            >
              {(identities.length
                ? identities
                : [{ id: "fallback", email: defaultFrom, displayName: "Clay Services" }]
              ).map((identity) => (
                <option key={identity.id || identity.email} value={identity.email}>
                  {identity.displayName} &lt;{identity.email}&gt;
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-semibold tracking-wide text-ink-soft uppercase">
              To
            </span>
            <input
              required
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className="w-full rounded-2xl border border-line bg-white px-3 py-2.5 outline-none ring-accent/30 focus:ring-2"
              placeholder="recipient@example.com"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-semibold tracking-wide text-ink-soft uppercase">
              Subject
            </span>
            <input
              required
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              className="w-full rounded-2xl border border-line bg-white px-3 py-2.5 outline-none ring-accent/30 focus:ring-2"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-semibold tracking-wide text-ink-soft uppercase">
              Message
            </span>
            <textarea
              required
              rows={12}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              className="w-full resize-y rounded-2xl border border-line bg-white px-3 py-3 leading-6 outline-none ring-accent/30 focus:ring-2"
            />
          </label>
          {error ? (
            <p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          ) : null}
        </div>

        <footer className="flex items-center justify-between border-t border-line px-5 py-4">
          <Link href="/login" className="text-xs text-ink-soft md:hidden">
            Account
          </Link>
          <button
            type="submit"
            disabled={sending}
            className="rounded-2xl bg-accent px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {sending ? "Sending…" : "Send with Plunk"}
          </button>
        </footer>
      </form>
    </div>
  );
}
