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

export function inspectPlunkSecretKey(raw?: string | null): {
  configured: boolean;
  kind: "secret" | "public" | "unknown" | "missing";
} {
  const apiKey = raw?.trim() || "";
  if (!apiKey) {
    return { configured: false, kind: "missing" };
  }
  if (apiKey.startsWith("sk_")) {
    return { configured: true, kind: "secret" };
  }
  if (apiKey.startsWith("pk_")) {
    return { configured: true, kind: "public" };
  }
  return { configured: true, kind: "unknown" };
}

export async function sendWithPlunk(
  input: PlunkSendInput,
  idempotencyKey?: string,
): Promise<PlunkSendResult> {
  const apiKey = requireEnv("PLUNK_SECRET_KEY").trim();
  const keyInfo = inspectPlunkSecretKey(apiKey);
  if (keyInfo.kind === "public") {
    return {
      success: false,
      error: "plunk_public_key",
      message:
        "PLUNK_SECRET_KEY is a public key (pk_*). Replace it in Vercel with your secret key (sk_*), then redeploy.",
    };
  }

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
