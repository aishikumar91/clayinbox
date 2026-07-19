"use client";

import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";

function LoginForm() {
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{
    mailboxPasswordConfigured: boolean;
    databaseConfigured: boolean;
    plunkConfigured: boolean;
  } | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) =>
        setStatus({
          mailboxPasswordConfigured: Boolean(data.mailboxPasswordConfigured),
          databaseConfigured: Boolean(data.databaseConfigured),
          plunkConfigured: Boolean(data.plunkConfigured),
        }),
      )
      .catch(() => setStatus(null));
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
        credentials: "same-origin",
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(payload.error || "Unable to sign in");
        setLoading(false);
        return;
      }

      // Hard navigation so the session cookie is definitely picked up.
      window.location.href = searchParams.get("next") || "/inbox";
    } catch {
      setError("Network error while signing in");
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="animate-rise w-full max-w-md rounded-[28px] border border-line bg-paper-elevated p-8 shadow-[var(--shadow)]"
    >
      <p className="font-[family-name:var(--font-display)] text-4xl tracking-tight text-ink">
        Clay Inbox
      </p>
      <p className="mt-2 text-sm leading-6 text-ink-soft">
        Standalone webmail for <strong>clay-services.icu</strong> — Plunk for
        send/receive, full inbox UI in the browser.
      </p>

      <label className="mt-8 block">
        <span className="mb-1.5 block text-xs font-semibold tracking-wide text-ink-soft uppercase">
          Mailbox password
        </span>
        <input
          type="password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-2xl border border-line bg-white px-3 py-3 text-sm outline-none ring-accent/30 focus:ring-2"
          placeholder="MAILBOX_PASSWORD from Vercel env"
          autoComplete="current-password"
        />
      </label>

      {error ? (
        <p className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {status ? (
        <ul className="mt-4 space-y-1 text-xs text-ink-soft">
          <li>
            Password env:{" "}
            {status.mailboxPasswordConfigured ? "configured" : "missing"}
          </li>
          <li>
            Supabase DATABASE_URL:{" "}
            {status.databaseConfigured ? "configured" : "missing"}
          </li>
          <li>
            Plunk API key: {status.plunkConfigured ? "configured" : "missing"}
          </li>
        </ul>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="mt-6 w-full rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:bg-accent-deep disabled:opacity-60"
      >
        {loading ? "Signing in…" : "Open inbox"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <Suspense
        fallback={
          <div className="w-full max-w-md rounded-[28px] border border-line bg-paper-elevated p-8">
            Loading…
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
