"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const payload = await response.json().catch(() => ({}));
    setLoading(false);

    if (!response.ok) {
      setError(payload.error || "Unable to sign in");
      return;
    }

    router.push(searchParams.get("next") || "/inbox");
    router.refresh();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="animate-rise w-full max-w-md rounded-[28px] border border-line bg-paper-elevated p-8 shadow-[var(--shadow)]"
    >
      <p className="font-[family-name:var(--font-display)] text-4xl tracking-tight text-ink">
        Emailbox
      </p>
      <p className="mt-2 text-sm leading-6 text-ink-soft">
        Webmail for <strong>clay-services.icu</strong>, connected to Plunk for
        send and inbound delivery.
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
          placeholder="Enter mailbox password"
          autoComplete="current-password"
        />
      </label>

      {error ? (
        <p className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="mt-6 w-full rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:bg-accent-deep disabled:opacity-60"
      >
        {loading ? "Signing in…" : "Open mailbox"}
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
