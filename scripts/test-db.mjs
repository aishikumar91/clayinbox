#!/usr/bin/env node
/**
 * Quick Supabase connectivity + migration check.
 * Usage: DATABASE_URL='postgresql://...' node scripts/test-db.mjs
 */
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("FAIL: DATABASE_URL is not set");
  process.exit(1);
}

const redacted = url.replace(/:([^:@/]+)@/, ":***@");
console.log("Connecting:", redacted);

const sql = postgres(url, { prepare: false, max: 1, connect_timeout: 15 });

try {
  const [{ ok }] = await sql`select 1::int as ok`;
  console.log("Ping:", ok === 1 ? "OK" : ok);

  const tables = await sql`
    select table_name
    from information_schema.tables
    where table_schema = 'public'
      and table_name in ('messages', 'identities')
    order by table_name
  `;
  const names = tables.map((t) => t.table_name);
  console.log("Tables:", names.length ? names.join(", ") : "(none)");

  if (!names.includes("messages") || !names.includes("identities")) {
    console.error("FAIL: migration tables missing. Re-run supabase/migrations/20260719044500_emailbox_mailbox.sql");
    process.exit(2);
  }

  const cols = await sql`
    select column_name
    from information_schema.columns
    where table_schema = 'public' and table_name = 'messages'
    order by ordinal_position
  `;
  console.log(
    "messages columns:",
    cols.map((c) => c.column_name).join(", "),
  );

  const [{ msg_count }] = await sql`select count(*)::int as msg_count from messages`;
  const [{ id_count }] = await sql`select count(*)::int as id_count from identities`;
  console.log("Row counts: messages=", msg_count, "identities=", id_count);

  const rls = await sql`
    select c.relname as table, c.relrowsecurity as rls_enabled
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname in ('messages', 'identities')
    order by c.relname
  `;
  for (const row of rls) {
    console.log(`RLS ${row.table}:`, row.rls_enabled ? "enabled" : "disabled");
  }

  console.log("SUCCESS: database connect + migration look correct");
  process.exit(0);
} catch (error) {
  console.error("FAIL:", error instanceof Error ? error.message : error);
  process.exit(1);
} finally {
  await sql.end({ timeout: 5 });
}
