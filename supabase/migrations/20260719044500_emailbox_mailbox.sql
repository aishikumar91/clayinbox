-- Emailbox mailbox schema for clay-services.icu (Supabase Postgres)
-- Run in Supabase SQL Editor, or: supabase db push

create table if not exists public.messages (
  id text primary key,
  direction text not null check (direction in ('inbound', 'outbound')),
  folder text not null default 'inbox'
    check (folder in ('inbox', 'sent', 'archive', 'trash')),
  message_id text,
  in_reply_to text,
  thread_key text not null,
  from_address text not null,
  from_name text,
  to_addresses text not null,
  cc_addresses text,
  subject text not null default '(no subject)',
  body_html text,
  body_text text,
  preview text not null default '',
  read boolean not null default false,
  starred boolean not null default false,
  spam_verdict text,
  virus_verdict text,
  spf_verdict text,
  dkim_verdict text,
  dmarc_verdict text,
  plunk_email_id text,
  raw_payload text,
  received_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_messages_folder_received
  on public.messages (folder, received_at desc);

create index if not exists idx_messages_thread
  on public.messages (thread_key, received_at desc);

create table if not exists public.identities (
  id text primary key,
  email text not null unique,
  display_name text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

-- Server uses DATABASE_URL (service role / direct Postgres).
-- Lock down PostgREST: no anon/authenticated table access.
alter table public.messages enable row level security;
alter table public.identities enable row level security;

revoke all on table public.messages from anon, authenticated;
revoke all on table public.identities from anon, authenticated;

grant all on table public.messages to service_role;
grant all on table public.identities to service_role;
