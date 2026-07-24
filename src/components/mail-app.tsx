"use client";

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
import { EmailLogo } from "@/components/brand";
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
    await fetch(`/api/emails/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await load(folder, query);
  }

  function openCompose(message?: Message | null) {
    setReplyTo(message || null);
    setComposeOpen(true);
  }

  return (
    <div className="mail-shell">
      <aside className="mail-sidebar">
        <div className="brand-block animate-rise">
          <EmailLogo size={42} />
          <div>
            <p className="brand-title">{appName}</p>
            <p className="brand-sub">@{domain}</p>
          </div>
        </div>

        <button
          type="button"
          className="mail-compose-btn"
          onClick={() => openCompose(null)}
        >
          <MailPlus className="h-4 w-4" />
          Compose
        </button>

        <nav className="mail-nav">
          {folders.map((item) => {
            const Icon = item.icon;
            const unread = counts[item.id]?.unread || 0;
            return (
              <button
                key={item.id}
                type="button"
                className={folder === item.id ? "active" : ""}
                onClick={() => {
                  setFolder(item.id);
                  setSelectedId(null);
                }}
              >
                <span className="inline-flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  {item.label}
                </span>
                {unread > 0 ? <span className="badge">{unread}</span> : null}
              </button>
            );
          })}
        </nav>

        <div className="mail-sidebar-footer">
          <button type="button" onClick={() => void load(folder, query)}>
            <RefreshCw className="h-4 w-4" />
            Refresh stream
          </button>
          <button type="button" onClick={logout}>
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      <section className="mail-list-pane">
        <header className="mail-pane-header">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl capitalize tracking-tight">{folder}</h1>
              <p className="text-xs text-ink-soft">
                {emails.length} message{emails.length === 1 ? "" : "s"} · table view
              </p>
            </div>
            <div className="mobile-top-actions">
              <button
                type="button"
                className="rounded-xl border border-line bg-white p-2 text-ink-soft"
                onClick={() => void load(folder, query)}
              >
                <RefreshCw className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="rounded-xl border border-line bg-white p-2 text-ink-soft"
                onClick={logout}
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
          <label className="mail-search">
            <Search className="h-4 w-4" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void load(folder, query);
              }}
              placeholder="Search sender, subject, preview"
            />
          </label>
        </header>

        <div className="mail-table-wrap">
          {loading ? (
            <div className="mail-loading">
              <LoaderCircle className="mx-auto mb-2 h-5 w-5 animate-spin" />
              Syncing mailbox…
            </div>
          ) : error ? (
            <div className="mail-error">
              <p className="font-semibold">Mailbox unavailable</p>
              <p className="mt-1 text-sm">{error}</p>
            </div>
          ) : emails.length === 0 ? (
            <div className="mail-empty">
              <EmailLogo size={48} className="mx-auto mb-3" />
              <p className="font-[family-name:var(--font-display)] text-2xl text-ink">
                {folder === "inbox" ? "Inbox zero" : "No messages"}
              </p>
              <p className="mx-auto mt-2 max-w-sm text-sm">
                {folder === "inbox"
                  ? "Inbound Plunk webhooks will appear here as a live table."
                  : "Moved or sent mail will populate this folder table."}
              </p>
              <button
                type="button"
                className="mail-compose-btn mx-auto mt-4 max-w-xs"
                onClick={() => openCompose(null)}
              >
                <Pencil className="h-4 w-4" />
                Write email
              </button>
            </div>
          ) : (
            <table className="mail-table">
              <thead>
                <tr>
                  <th>From / To</th>
                  <th>Subject</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {emails.map((email) => {
                  const counterpart =
                    folder === "sent"
                      ? parseJsonAddresses(email.toAddresses).join(", ")
                      : email.fromName || email.fromAddress;
                  return (
                    <tr
                      key={email.id}
                      className={`${email.id === selectedId ? "active" : ""} ${
                        email.read ? "" : "unread"
                      }`}
                      onClick={() => setSelectedId(email.id)}
                    >
                      <td>{counterpart}</td>
                      <td>
                        <span className="subject">{email.subject}</span>
                        <span className="preview">
                          {email.preview || "No preview"}
                        </span>
                      </td>
                      <td className="date">
                        {formatMailboxDate(email.receivedAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section className="mail-reader-pane">
        {!selected ? (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <EmailLogo size={64} />
            <p className="mt-4 font-[family-name:var(--font-display)] text-3xl">
              Clay Inbox
            </p>
            <p className="mt-2 max-w-md text-sm text-ink-soft">
              Select a row from the message table, or compose a new message.
              Outbound uses Plunk · inbound lands via webhook.
            </p>
          </div>
        ) : (
          <>
            <header className="mail-pane-header flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-2xl tracking-tight md:text-3xl">
                  {selected.subject}
                </h2>
                <p className="mt-1 text-xs text-ink-soft">
                  {formatFullDate(selected.receivedAt)}
                </p>
              </div>
              <div className="mail-reader-actions">
                <button
                  type="button"
                  className="primary"
                  onClick={() => openCompose(selected)}
                >
                  <Reply className="h-4 w-4" />
                  Reply
                </button>
                <button
                  type="button"
                  onClick={() => void patchSelected({ folder: "archive" })}
                >
                  <Archive className="h-4 w-4" />
                  Archive
                </button>
                <button
                  type="button"
                  className="danger"
                  onClick={() => void patchSelected({ folder: "trash" })}
                >
                  <Trash2 className="h-4 w-4" />
                  Trash
                </button>
              </div>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 md:px-6">
              <div className="mail-meta-card">
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
                    selected.bodyHtml || `<p>${selected.bodyText || ""}</p>`,
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
    `info@${domain}`;
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
    const recipients = to
      .split(/[,;\s]+/)
      .map((part) => part.trim())
      .filter(Boolean);
    if (recipients.length === 0) {
      setSending(false);
      setError("Enter at least one recipient email");
      return;
    }

    const response = await fetch("/api/emails/send", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: recipients.length === 1 ? recipients[0] : recipients,
        subject,
        body: body.replace(/\n/g, "<br />"),
        replyToId: replyTo?.id,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    setSending(false);
    if (!response.ok) {
      setError(
        payload.message ||
          payload.error ||
          (response.status === 401
            ? "Session expired — log in again, then retry send"
            : "Send failed"),
      );
      return;
    }
    await onSent();
  }

  return (
    <div className="mail-compose-overlay animate-fade">
      <form onSubmit={submit} className="mail-compose-panel animate-rise">
        <header className="flex items-center justify-between border-b border-line px-5 py-4">
          <div className="flex items-center gap-3">
            <EmailLogo size={32} />
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-2xl">
                {replyTo ? "Reply" : "New message"}
              </h2>
              <p className="text-xs text-ink-soft">Sends through Plunk</p>
            </div>
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
          <label className="field">
            <span>From</span>
            <select
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            >
              {(identities.length
                ? identities
                : [
                    {
                      id: "fallback",
                      email: defaultFrom,
                      displayName: "Clay Services",
                    },
                  ]
              ).map((identity) => (
                <option key={identity.id || identity.email} value={identity.email}>
                  {identity.displayName} &lt;{identity.email}&gt;
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>To</span>
            <input
              required
              value={to}
              onChange={(event) => setTo(event.target.value)}
              placeholder="recipient@example.com"
            />
          </label>
          <label className="field">
            <span>Subject</span>
            <input
              required
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
            />
          </label>
          <label className="field">
            <span>Message</span>
            <textarea
              required
              rows={12}
              value={body}
              onChange={(event) => setBody(event.target.value)}
            />
          </label>
          {error ? <p className="login-error">{error}</p> : null}
        </div>

        <footer className="flex items-center justify-end border-t border-line px-5 py-4">
          <button type="submit" disabled={sending} className="login-submit">
            {sending ? "Sending…" : "Send with Plunk"}
          </button>
        </footer>
      </form>
    </div>
  );
}
