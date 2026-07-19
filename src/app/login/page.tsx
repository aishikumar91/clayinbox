"use client";

import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { EmailLogo, EmailNetworkDiagram } from "@/components/brand";

function LoginForm() {
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("info@clay-services.icu");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
        credentials: "same-origin",
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(payload.error || "Unable to sign in");
        setLoading(false);
        return;
      }

      window.location.href = searchParams.get("next") || "/inbox";
    } catch {
      setError("Network error while signing in");
      setLoading(false);
    }
  }

  return (
    <div className="login-shell">
      <section className="login-visual animate-fade">
        <div className="login-brand-row">
          <EmailLogo size={56} />
          <div>
            <p className="login-brand-name">Clay Inbox</p>
            <p className="login-brand-sub">clay-services.icu · powered by Plunk</p>
          </div>
        </div>
        <EmailNetworkDiagram className="login-diagram" />
        <p className="login-caption">
          Futuristic webmail with secure outbound + inbound routing for your
          verified domain.
        </p>
      </section>

      <section className="login-panel animate-rise">
        <div className="login-panel-mobile-logo">
          <EmailLogo size={44} />
        </div>
        <h1 className="login-title">Sign in to your mailbox</h1>
        <p className="login-copy">
          Enter your Clay username and mailbox password to open the inbox
          dashboard.
        </p>

        <form onSubmit={onSubmit} className="login-form">
          <label className="field">
            <span>Username</span>
            <input
              type="text"
              required
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="info@clay-services.icu"
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Mailbox password"
            />
          </label>

          {error ? <p className="login-error">{error}</p> : null}

          <button type="submit" disabled={loading} className="login-submit">
            {loading ? "Signing in…" : "Open Clay Inbox"}
          </button>
        </form>
      </section>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="login-shell">
          <div className="login-panel">Loading…</div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
