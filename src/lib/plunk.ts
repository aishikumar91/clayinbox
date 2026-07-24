import { PLUNK_API_URL, requireEnv } from "./config";

export type PlunkSendInput = {
  to: string | string[];
  subject: string;
  body: string;
  from: string | { name: string; email: string };
  reply?: string;
  headers?: Record<string, string>;
};

export type PlunkSendResult = {
  success: boolean;
  data?: {
    emails?: Array<{
      contact?: { id: string; email: string };
      email?: string;
    }>;
    timestamp?: string;
  };
  error?: string;
  message?: string;
};

type PlunkErrorPayload = {
  success?: boolean;
  error?: string | { code?: string; message?: string; statusCode?: number };
  message?: string;
  code?: string | number;
};

function extractPlunkError(payload: PlunkErrorPayload, status: number): {
  error: string;
  message: string;
} {
  if (payload.error && typeof payload.error === "object") {
    return {
      error: payload.error.code || "plunk_send_failed",
      message:
        payload.error.message ||
        `Plunk API returned ${status}`,
    };
  }

  if (typeof payload.error === "string") {
    return {
      error: payload.error,
      message: payload.message || payload.error,
    };
  }

  return {
    error: "plunk_send_failed",
    message: payload.message || `Plunk API returned ${status}`,
  };
}

/** Strip quotes / Bearer / junk that often break Vercel env pastes. */
export function normalizePlunkApiKey(raw?: string | null): string {
  let apiKey = (raw || "")
    .replace(/^\uFEFF/, "")
    .replace(/[\r\n\t]/g, "")
    .trim();
  if (
    (apiKey.startsWith('"') && apiKey.endsWith('"')) ||
    (apiKey.startsWith("'") && apiKey.endsWith("'"))
  ) {
    apiKey = apiKey.slice(1, -1).trim();
  }
  if (/^bearer\s+/i.test(apiKey)) {
    apiKey = apiKey.replace(/^bearer\s+/i, "").trim();
  }
  // Prefer an embedded secret key if the env value was pasted messily.
  const secretMatch = apiKey.match(/sk_[a-f0-9]+/i);
  if (secretMatch) {
    return secretMatch[0];
  }
  const publicMatch = apiKey.match(/pk_[a-f0-9]+/i);
  if (publicMatch) {
    return publicMatch[0];
  }
  return apiKey;
}

export function inspectPlunkSecretKey(raw?: string | null): {
  configured: boolean;
  kind: "secret" | "public" | "unknown" | "missing";
  normalized: string;
} {
  const apiKey = normalizePlunkApiKey(raw);
  if (!apiKey) {
    return { configured: false, kind: "missing", normalized: "" };
  }
  if (apiKey.startsWith("sk_")) {
    return { configured: true, kind: "secret", normalized: apiKey };
  }
  if (apiKey.startsWith("pk_")) {
    return { configured: true, kind: "public", normalized: apiKey };
  }
  return { configured: true, kind: "unknown", normalized: apiKey };
}

/** Lightweight auth check — does not send mail. */
export async function probePlunkAuth(): Promise<{
  ok: boolean;
  status: number;
  message: string;
}> {
  const keyInfo = inspectPlunkSecretKey(process.env.PLUNK_SECRET_KEY);
  if (keyInfo.kind !== "secret") {
    return {
      ok: false,
      status: 0,
      message:
        keyInfo.kind === "public"
          ? "PLUNK_SECRET_KEY is a public pk_ key"
          : "PLUNK_SECRET_KEY missing or not an sk_ secret key",
    };
  }

  try {
    const response = await fetch(`${PLUNK_API_URL}/v1/verify`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${keyInfo.normalized}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: "probe@example.com" }),
    });
    const payload = (await response.json().catch(() => ({}))) as PlunkErrorPayload;
    if (!response.ok || payload.success === false) {
      const extracted = extractPlunkError(payload, response.status);
      return {
        ok: false,
        status: response.status,
        message: extracted.message,
      };
    }
    return { ok: true, status: response.status, message: "Plunk secret key accepted" };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      message:
        error instanceof Error
          ? `Could not reach Plunk (${error.message})`
          : "Could not reach Plunk",
    };
  }
}

export async function sendWithPlunk(
  input: PlunkSendInput,
  idempotencyKey?: string,
): Promise<PlunkSendResult> {
  const keyInfo = inspectPlunkSecretKey(requireEnv("PLUNK_SECRET_KEY"));
  if (keyInfo.kind === "public") {
    return {
      success: false,
      error: "plunk_public_key",
      message:
        "PLUNK_SECRET_KEY is a public key (pk_*). In Vercel → Environment Variables, set PLUNK_SECRET_KEY to your secret key starting with sk_, then Redeploy.",
    };
  }
  if (keyInfo.kind !== "secret") {
    return {
      success: false,
      error: "plunk_invalid_key",
      message:
        "PLUNK_SECRET_KEY must be a Plunk secret key starting with sk_ (not a public pk_ key, webhook secret, or quoted value). Update it in Vercel and Redeploy.",
    };
  }

  const apiKey = keyInfo.normalized;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
  if (idempotencyKey) {
    headers["Idempotency-Key"] = idempotencyKey;
  }

  let response: Response;
  try {
    response = await fetch(`${PLUNK_API_URL}/v1/send`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        to: input.to,
        subject: input.subject,
        body: input.body,
        from: input.from,
        reply: input.reply,
        headers: input.headers,
        subscribed: false,
      }),
    });
  } catch (error) {
    return {
      success: false,
      error: "plunk_network_error",
      message:
        error instanceof Error
          ? `Could not reach Plunk (${error.message})`
          : "Could not reach Plunk",
    };
  }

  const payload = (await response.json().catch(() => ({}))) as PlunkErrorPayload &
    PlunkSendResult;

  if (!response.ok || payload.success === false) {
    const extracted = extractPlunkError(payload, response.status);
    return {
      success: false,
      error: extracted.error,
      message: extracted.message,
    };
  }

  return {
    success: true,
    data: payload.data,
  };
}
