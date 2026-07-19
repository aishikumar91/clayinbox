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

export async function sendWithPlunk(
  input: PlunkSendInput,
  idempotencyKey?: string,
): Promise<PlunkSendResult> {
  const apiKey = requireEnv("PLUNK_SECRET_KEY");
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
  if (idempotencyKey) {
    headers["Idempotency-Key"] = idempotencyKey;
  }

  const response = await fetch(`${PLUNK_API_URL}/v1/send`, {
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

  const payload = (await response.json().catch(() => ({}))) as PlunkSendResult;

  if (!response.ok) {
    return {
      success: false,
      error: payload.error || "plunk_send_failed",
      message:
        payload.message ||
        `Plunk API returned ${response.status} ${response.statusText}`,
    };
  }

  return { ...payload, success: true };
}
