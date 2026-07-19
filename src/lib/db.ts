import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import * as schema from "./schema";

const defaultPath = join(process.cwd(), "data", "emailbox.db");
const dbPath = process.env.DATABASE_PATH || defaultPath;

mkdirSync(dirname(dbPath), { recursive: true });

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    direction TEXT NOT NULL,
    folder TEXT NOT NULL DEFAULT 'inbox',
    message_id TEXT,
    in_reply_to TEXT,
    thread_key TEXT NOT NULL,
    from_address TEXT NOT NULL,
    from_name TEXT,
    to_addresses TEXT NOT NULL,
    cc_addresses TEXT,
    subject TEXT NOT NULL DEFAULT '(no subject)',
    body_html TEXT,
    body_text TEXT,
    preview TEXT NOT NULL DEFAULT '',
    read INTEGER NOT NULL DEFAULT 0,
    starred INTEGER NOT NULL DEFAULT 0,
    spam_verdict TEXT,
    virus_verdict TEXT,
    spf_verdict TEXT,
    dkim_verdict TEXT,
    dmarc_verdict TEXT,
    plunk_email_id TEXT,
    raw_payload TEXT,
    received_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_messages_folder_received
    ON messages(folder, received_at DESC);
  CREATE INDEX IF NOT EXISTS idx_messages_thread
    ON messages(thread_key, received_at DESC);

  CREATE TABLE IF NOT EXISTS identities (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    is_default INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );
`);

export const db = drizzle(sqlite, { schema });
export { sqlite };
