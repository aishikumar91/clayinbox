#!/usr/bin/env node
/**
 * Send a Plunk test email from info@clay-services.icu
 *
 *   PLUNK_SECRET_KEY=sk_... node scripts/send-test.mjs
 */
const apiUrl = (process.env.PLUNK_API_URL || "https://next-api.useplunk.com").replace(/\/$/, "");
const key = process.env.PLUNK_SECRET_KEY;
const to = process.env.TEST_TO || "obibiifeanyi@gmail.com";
const fromEmail = process.env.DEFAULT_FROM_EMAIL || "info@clay-services.icu";

if (!key || key.includes("xxxx") || key.includes("replace")) {
  console.error("FAIL: set a real PLUNK_SECRET_KEY");
  process.exit(1);
}

const body = {
  to,
  subject: "Clay Inbox test · clay-services.icu",
  body: `<div style="font-family:Georgia,serif;line-height:1.5">
    <p>Hello,</p>
    <p>This is a test message from <strong>Clay Inbox</strong> via Plunk.</p>
    <p>From: ${fromEmail}<br/>Domain: clay-services.icu</p>
    <p>— Clay Services</p>
  </div>`,
  from: { name: "Clay Services", email: fromEmail },
  reply: fromEmail,
  subscribed: false,
};

const res = await fetch(`${apiUrl}/v1/send`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    "Idempotency-Key": `clay-test-${Date.now()}`,
  },
  body: JSON.stringify(body),
});

const json = await res.json().catch(() => ({}));
console.log("HTTP", res.status);
console.log(JSON.stringify(json, null, 2));
if (!res.ok || json.success === false) process.exit(2);
console.log("SUCCESS: queued to", to, "from", fromEmail);
