import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const messages = sqliteTable("messages", {
  id: text("id").primaryKey(),
  direction: text("direction", { enum: ["inbound", "outbound"] }).notNull(),
  folder: text("folder", { enum: ["inbox", "sent", "archive", "trash"] })
    .notNull()
    .default("inbox"),
  messageId: text("message_id"),
  inReplyTo: text("in_reply_to"),
  threadKey: text("thread_key").notNull(),
  fromAddress: text("from_address").notNull(),
  fromName: text("from_name"),
  toAddresses: text("to_addresses").notNull(),
  ccAddresses: text("cc_addresses"),
  subject: text("subject").notNull().default("(no subject)"),
  bodyHtml: text("body_html"),
  bodyText: text("body_text"),
  preview: text("preview").notNull().default(""),
  read: integer("read", { mode: "boolean" }).notNull().default(false),
  starred: integer("starred", { mode: "boolean" }).notNull().default(false),
  spamVerdict: text("spam_verdict"),
  virusVerdict: text("virus_verdict"),
  spfVerdict: text("spf_verdict"),
  dkimVerdict: text("dkim_verdict"),
  dmarcVerdict: text("dmarc_verdict"),
  plunkEmailId: text("plunk_email_id"),
  rawPayload: text("raw_payload"),
  receivedAt: text("received_at").notNull(),
  createdAt: text("created_at").notNull(),
});

export const identities = sqliteTable("identities", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  displayName: text("display_name").notNull(),
  isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
});

export type Message = typeof messages.$inferSelect;
export type Identity = typeof identities.$inferSelect;
