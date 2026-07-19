# Emailbox · clay-services.icu

Plunk-powered webmail client for **clay-services.icu**.

## Why a custom client (not Roundcube / Oxi / Aspire Mail)?

GitHub open-source webmail options were evaluated for this domain:

| Project | Stack | Why it does not fit Plunk |
| --- | --- | --- |
| [Oxi](https://github.com/c0h1b4/oxi) / [Rav](https://github.com/naust-mail/rav) | React + Rust | Requires IMAP/SMTP mailbox servers |
| [Aspire Mail](https://github.com/sagargujarathi/aspire-mail) | Next.js | IMAP/SMTP only |
| [Bulwark](https://github.com/bulwarkmail/webmail) | Next.js + JMAP | Built for Stalwart, not Plunk |
| [Kurrier](https://github.com/kurrier-org/kurrier) | Next.js | IMAP-centric; Plunk is not an IMAP provider |
| [Sendbox](https://github.com/coreyepstein/sendbox) | Next.js + Resend | Closest architecture (webhook inbox + API send), but hard-wired to Resend |

**Plunk** sends via `POST /v1/send` (or SMTP) and receives via inbound MX + `email.received` workflows/webhooks. It does **not** expose IMAP. Emailbox follows the Sendbox-style pattern adapted for Plunk:

```
Inbound:  MX → Plunk → workflow webhook → POST /api/webhooks/plunk → SQLite → Inbox UI
Outbound: Compose UI → POST /api/emails/send → Plunk /v1/send → Sent folder
```

## Features

- Password-protected mailbox UI
- Inbox / Sent / Archive / Trash
- Compose + reply through Plunk API
- Inbound webhook for Plunk `email.received` workflows
- Identities on `@clay-services.icu` (`hello`, `support`, `noreply`)
- HTML sanitization for inbound bodies
- Docker / Compose deployment with persistent SQLite volume

## Quick start

```bash
cp .env.example .env
# set PLUNK_SECRET_KEY, MAILBOX_PASSWORD, SESSION_SECRET, PLUNK_WEBHOOK_SECRET

npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with `MAILBOX_PASSWORD`.

## Plunk setup (clay-services.icu)

1. Confirm the domain is verified in Plunk (SPF + DKIM + bounce MX).
2. Add Plunk’s **Inbound Email MX** for `clay-services.icu` (or a mail subdomain if you must keep another provider on the apex).
3. Create a Plunk workflow:
   - Trigger: `email.received`
   - Optional condition: drop `spamVerdict == FAIL` / `virusVerdict == FAIL`
   - Action: **Webhook**
     - URL: `https://mail.clay-services.icu/api/webhooks/plunk`
     - Method: `POST`
     - Header: `x-emailbox-secret: <PLUNK_WEBHOOK_SECRET>`
     - Body example:

```json
{
  "from": "{{event.from}}",
  "to": "{{event.to}}",
  "recipients": "{{event.recipients}}",
  "subject": "{{event.subject}}",
  "body": "{{event.body}}",
  "messageId": "{{event.messageId}}",
  "timestamp": "{{event.timestamp}}",
  "spamVerdict": "{{event.spamVerdict}}",
  "virusVerdict": "{{event.virusVerdict}}",
  "spfVerdict": "{{event.spfVerdict}}",
  "dkimVerdict": "{{event.dkimVerdict}}",
  "dmarcVerdict": "{{event.dmarcVerdict}}"
}
```

4. Put your Plunk secret key in `PLUNK_SECRET_KEY`.
5. Send a test message to `hello@clay-services.icu` and confirm it lands in Inbox.

## Environment

See `.env.example`. Critical vars:

- `PLUNK_SECRET_KEY` — send API key (`sk_…`)
- `PLUNK_WEBHOOK_SECRET` — shared secret for inbound webhook auth
- `MAILBOX_PASSWORD` — UI login password
- `SESSION_SECRET` — ≥32 characters
- `MAIL_DOMAIN` — defaults to `clay-services.icu`

## Docker

```bash
cp .env.example .env
docker compose up -d --build
```

Data persists in the `emailbox-data` volume at `/data/emailbox.db`.

## API surface

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/login` | Session login |
| `POST` | `/api/auth/logout` | Session logout |
| `GET` | `/api/emails?folder=inbox` | List messages |
| `GET` | `/api/emails/:id` | Read message |
| `PATCH` | `/api/emails/:id` | Mark read / move folder |
| `POST` | `/api/emails/send` | Send via Plunk |
| `POST` | `/api/webhooks/plunk` | Plunk inbound webhook |
| `GET` | `/api/identities` | From-address identities |

## Local webhook test

```bash
curl -X POST http://localhost:3000/api/webhooks/plunk \
  -H 'content-type: application/json' \
  -H "x-emailbox-secret: $PLUNK_WEBHOOK_SECRET" \
  -d '{
    "from": "Ada Lovelace <ada@example.com>",
    "to": "hello@clay-services.icu",
    "subject": "Hello Emailbox",
    "body": "<p>Inbound via Plunk webhook.</p>",
    "messageId": "test-1",
    "timestamp": "2026-07-19T12:00:00.000Z",
    "spamVerdict": "PASS"
  }'
```

## Notes / Plunk limits

- Plunk inbound does not retain attachments or raw MIME — Emailbox stores the parsed body Plunk forwards.
- Catch-all inbound: filter on `to` in your Plunk workflow if you need address-specific routing.
- Keep `PLUNK_SECRET_KEY` server-side only.
