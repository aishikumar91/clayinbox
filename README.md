# Emailbox · clay-services.icu

Plunk-powered webmail for **clay-services.icu**, stored in **Supabase Postgres**, deployable on **Vercel**.

## Why not Plunk as the mailbox DB?

Plunk is an email **API / automation** platform, not a mailbox store:

- Public app API is mainly `POST /v1/send`, `POST /v1/track`, contacts/campaigns/workflows
- Inbound mail is meant to be forwarded to **your** backend via `email.received` webhooks
- `GET /activity` / `GET /events` are dashboard-style feeds, not folders / read-state / trash / reply UX
- Plunk does not keep attachments, raw MIME, or mail threading for a client

So Emailbox uses Plunk for **transport** and Supabase for the **mailbox**.

```
Inbound:  MX → Plunk → workflow webhook → /api/webhooks/plunk → Supabase → Inbox UI
Outbound: Compose → /api/emails/send → Plunk /v1/send → Supabase Sent folder
```

## Supabase setup

1. Create a Supabase project.
2. Open **SQL Editor** and run  
   [`supabase/migrations/20260719044500_emailbox_mailbox.sql`](supabase/migrations/20260719044500_emailbox_mailbox.sql)
3. Copy **Database → Connection string → URI**  
   - Local/dev: Session mode is fine  
   - **Vercel:** use **Transaction pooler** (port `6543`)
4. Set `DATABASE_URL` in `.env` and in the Vercel project env.

RLS is enabled with no anon/authenticated policies — the Next.js server uses the Postgres URI directly (not the browser anon key).

## Vercel env vars

| Name | Purpose |
| --- | --- |
| `DATABASE_URL` | Supabase pooler Postgres URI |
| `PLUNK_SECRET_KEY` | Send API key (`sk_…`) |
| `PLUNK_WEBHOOK_SECRET` | Shared secret for inbound webhook header |
| `MAILBOX_PASSWORD` | UI login password |
| `SESSION_SECRET` | ≥32 characters |
| `MAIL_DOMAIN` | `clay-services.icu` |
| `DEFAULT_FROM_EMAIL` | `hello@clay-services.icu` |
| `APP_URL` | Public site URL (e.g. Vercel domain) |

## Quick start

```bash
cp .env.example .env
# set DATABASE_URL + Plunk + mailbox secrets
npm install
npm run dev
```

## Plunk inbound workflow

1. Verify `clay-services.icu` in Plunk (SPF + DKIM + bounce MX).
2. Add Plunk inbound MX.
3. Workflow trigger: `email.received` → Webhook:
   - URL: `https://<your-vercel-host>/api/webhooks/plunk`
   - Header: `x-emailbox-secret: <PLUNK_WEBHOOK_SECRET>`
   - Body:

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

## Repo

https://github.com/aishikumar91/clayinbox
