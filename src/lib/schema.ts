import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const messages = pgTable(
  "messages",
  {
    id: text("id").primaryKey(),
    direction: text("direction").notNull(),
    folder: text("folder").notNull().default("inbox"),
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
    read: boolean("read").notNull().default(false),
    starred: boolean("starred").notNull().default(false),
    spamVerdict: text("spam_verdict"),
    virusVerdict: text("virus_verdict"),
    spfVerdict: text("spf_verdict"),
    dkimVerdict: text("dkim_verdict"),
    dmarcVerdict: text("dmarc_verdict"),
    plunkEmailId: text("plunk_email_id"),
    rawPayload: text("raw_payload"),
    receivedAt: timestamp("received_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_messages_folder_received").on(table.folder, table.receivedAt),
    index("idx_messages_thread").on(table.threadKey, table.receivedAt),
  ],
);

export const identities = pgTable("identities", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  displayName: text("display_name").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
});

export type Message = typeof messages.$inferSelect;
export type Identity = typeof identities.$inferSelect;
