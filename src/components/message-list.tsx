"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { formatMailboxDate, parseJsonAddresses } from "@/lib/format";
import type { Message } from "@/lib/schema";

export function MessageList({
  emails,
  folder,
  title,
  emptyLabel,
}: {
  emails: Message[];
  folder: string;
  title: string;
  emptyLabel: string;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return emails;
    return emails.filter((email) => {
      const haystack = [
        email.subject,
        email.fromAddress,
        email.fromName || "",
        email.preview,
        parseJsonAddresses(email.toAddresses).join(" "),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [emails, query]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="animate-fade border-b border-line px-5 py-5 md:px-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-tight text-ink">
              {title}
            </h1>
            <p className="mt-1 text-sm text-ink-soft">
              {filtered.length} message{filtered.length === 1 ? "" : "s"}
            </p>
          </div>
          <label className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-soft" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Search ${title.toLowerCase()}`}
              className="w-full rounded-2xl border border-line bg-white/80 py-2.5 pr-3 pl-10 text-sm outline-none ring-accent/30 transition focus:ring-2"
            />
          </label>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="animate-rise flex h-full flex-col items-center justify-center px-6 py-16 text-center">
            <p className="font-[family-name:var(--font-display)] text-2xl text-ink">
              Nothing here yet
            </p>
            <p className="mt-2 max-w-md text-sm text-ink-soft">{emptyLabel}</p>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {filtered.map((email, index) => {
              const counterpart =
                folder === "sent"
                  ? parseJsonAddresses(email.toAddresses).join(", ")
                  : email.fromName || email.fromAddress;
              return (
                <li
                  key={email.id}
                  className="animate-rise"
                  style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
                >
                  <Link
                    href={`/${folder}/${email.id}`}
                    className={`grid grid-cols-[1fr_auto] gap-3 px-5 py-4 transition hover:bg-accent-soft/40 md:grid-cols-[220px_1fr_90px] md:px-7 ${
                      email.read ? "bg-transparent" : "bg-accent-soft/25"
                    }`}
                  >
                    <div className="min-w-0">
                      <p
                        className={`truncate text-sm ${
                          email.read ? "font-medium text-ink-soft" : "font-semibold text-ink"
                        }`}
                      >
                        {counterpart}
                      </p>
                      <p className="mt-1 truncate text-xs text-ink-soft md:hidden">
                        {email.subject}
                      </p>
                    </div>
                    <div className="hidden min-w-0 md:block">
                      <p
                        className={`truncate text-sm ${
                          email.read ? "text-ink-soft" : "font-semibold text-ink"
                        }`}
                      >
                        {email.subject}
                      </p>
                      <p className="mt-1 truncate text-xs text-ink-soft">
                        {email.preview || "No preview"}
                      </p>
                    </div>
                    <div className="text-right text-xs text-ink-soft">
                      {formatMailboxDate(email.receivedAt)}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
