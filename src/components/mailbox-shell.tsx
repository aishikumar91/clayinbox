"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Archive,
  Inbox,
  LogOut,
  MailPlus,
  Send,
  Trash2,
} from "lucide-react";
import type { ReactNode } from "react";

type Counts = Record<string, { total: number; unread: number }>;

const nav = [
  { href: "/inbox", label: "Inbox", icon: Inbox, folder: "inbox" },
  { href: "/sent", label: "Sent", icon: Send, folder: "sent" },
  { href: "/archive", label: "Archive", icon: Archive, folder: "archive" },
  { href: "/trash", label: "Trash", icon: Trash2, folder: "trash" },
] as const;

export function MailboxShell({
  children,
  counts,
  domain,
  appName,
}: {
  children: ReactNode;
  counts?: Counts;
  domain: string;
  appName: string;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-3 py-3 md:px-5 md:py-5">
      <div className="grid min-h-[calc(100vh-1.5rem)] overflow-hidden rounded-[28px] border border-line bg-paper-elevated shadow-[var(--shadow)] md:min-h-[calc(100vh-2.5rem)] md:grid-cols-[240px_1fr]">
        <aside className="flex flex-col border-b border-line bg-panel/70 p-4 md:border-b-0 md:border-r">
          <div className="animate-rise mb-6">
            <p className="font-[family-name:var(--font-display)] text-2xl tracking-tight text-ink">
              {appName}
            </p>
            <p className="mt-1 text-sm text-ink-soft">@{domain}</p>
          </div>

          <Link
            href="/compose"
            className="mb-5 inline-flex items-center justify-center gap-2 rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:bg-accent-deep"
          >
            <MailPlus className="h-4 w-4" />
            Compose
          </Link>

          <nav className="flex gap-2 overflow-x-auto md:flex-col md:overflow-visible">
            {nav.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              const unread = counts?.[item.folder]?.unread || 0;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex min-w-[7.5rem] items-center justify-between gap-3 rounded-2xl px-3 py-2.5 text-sm transition md:min-w-0 ${
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
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto hidden pt-8 md:block">
            <p className="text-xs uppercase tracking-[0.18em] text-ink-soft">
              Powered by Plunk
            </p>
            <button
              type="button"
              onClick={logout}
              className="mt-3 inline-flex items-center gap-2 text-sm text-ink-soft transition hover:text-ink"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </aside>

        <main className="flex min-h-0 flex-col bg-paper-elevated">{children}</main>
      </div>
    </div>
  );
}
