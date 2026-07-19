import { and, desc, eq, like, or, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import sanitizeHtml from "sanitize-html";
import { MAIL_DOMAIN } from "./config";
import { db } from "./db";
import { identities, messages, type Message } from "./schema";

export type Folder = "inbox" | "sent" | "archive" | "trash";

export type InboundPayload = {
  from?: string;
  to?: string | string[];
  recipients?: string[];
  subject?: string;
  body?: string;
  messageId?: string;
  timestamp?: string;
  spamVerdict?: string;
  virusVerdict?: string;
  spfVerdict?: string;
  dkimVerdict?: string;
  dmarcVerdict?: string;
  verdicts?: {
    spam?: string;
    virus?: string;
    spf?: string;
    dkim?: string;
    dmarc?: string;
  };
  // Plunk workflow templates may nest under event
  event?: InboundPayload;
};

const sanitizeOptions: sanitizeHtml.IOptions = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat([
    "img",
    "h1",
    "h2",
    "span",
  ]),
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    img: ["src", "alt", "width", "height"],
    a: ["href", "name", "target", "rel"],
    "*": ["style", "class"],
  },
  allowedSchemes: ["http", "https", "mailto"],
};

export function parseAddress(raw: string): { email: string; name?: string } {
  const trimmed = raw.trim();
  const match = trimmed.match(/^(?:"?([^"]*)"?\s)?<?([^>]+@[^>]+)>?$/);
  if (!match) {
    return { email: trimmed.toLowerCase() };
  }
  const name = match[1]?.trim() || undefined;
  const email = match[2].trim().toLowerCase();
  return { name, email };
}

export function normalizeSubject(subject: string): string {
  return subject.replace(/^(re|fwd|fw):\s*/i, "").trim().toLowerCase() || "(no subject)";
}

export function threadKeyFor(subject: string, fallbackId: string): string {
  const normalized = normalizeSubject(subject);
  return normalized === "(no subject)" ? `id:${fallbackId}` : `subj:${normalized}`;
}

export function htmlToPreview(htmlOrText: string, max = 160): string {
  const text = htmlOrText
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

export function sanitizeBody(body: string): { html: string; text: string } {
  const looksHtml = /<\/?[a-z][\s\S]*>/i.test(body);
  if (looksHtml) {
    const html = sanitizeHtml(body, sanitizeOptions);
    return { html, text: htmlToPreview(html, 5000) };
  }
  const escaped = body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const html = escaped.replace(/\n/g, "<br />");
  return { html, text: body };
}

function asAddressList(value: string | string[] | undefined): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((v) => parseAddress(String(v)).email).filter(Boolean);
  }
  return String(value)
    .split(",")
    .map((part) => parseAddress(part).email)
    .filter(Boolean);
}

export function unwrapInbound(payload: InboundPayload): InboundPayload {
  if (payload.event && (payload.event.from || payload.event.subject)) {
    return { ...payload.event, ...payload };
  }
  return payload;
}

export function ensureDefaultIdentities() {
  const existing = db.select().from(identities).all();
  if (existing.length > 0) return existing;

  const now = new Date().toISOString();
  const defaults = [
    {
      id: nanoid(),
      email: `hello@${MAIL_DOMAIN}`,
      displayName: "Clay Services",
      isDefault: true,
      createdAt: now,
    },
    {
      id: nanoid(),
      email: `support@${MAIL_DOMAIN}`,
      displayName: "Clay Support",
      isDefault: false,
      createdAt: now,
    },
    {
      id: nanoid(),
      email: `noreply@${MAIL_DOMAIN}`,
      displayName: "Clay No-Reply",
      isDefault: false,
      createdAt: now,
    },
  ];

  for (const identity of defaults) {
    db.insert(identities).values(identity).run();
  }
  return defaults;
}

export function listIdentities() {
  ensureDefaultIdentities();
  return db.select().from(identities).orderBy(desc(identities.isDefault)).all();
}

export function listMessages(folder: Folder, query?: string) {
  const clauses = [eq(messages.folder, folder)];
  if (query?.trim()) {
    const q = `%${query.trim()}%`;
    clauses.push(
      or(
        like(messages.subject, q),
        like(messages.fromAddress, q),
        like(messages.toAddresses, q),
        like(messages.preview, q),
      )!,
    );
  }

  return db
    .select()
    .from(messages)
    .where(and(...clauses))
    .orderBy(desc(messages.receivedAt))
    .all();
}

export function getMessage(id: string): Message | undefined {
  return db.select().from(messages).where(eq(messages.id, id)).get();
}

export function markRead(id: string, read = true) {
  db.update(messages).set({ read }).where(eq(messages.id, id)).run();
}

export function moveMessage(id: string, folder: Folder) {
  db.update(messages).set({ folder }).where(eq(messages.id, id)).run();
}

export function folderCounts() {
  const rows = db
    .select({
      folder: messages.folder,
      total: sql<number>`count(*)`,
      unread: sql<number>`sum(case when ${messages.read} = 0 then 1 else 0 end)`,
    })
    .from(messages)
    .groupBy(messages.folder)
    .all();

  const counts: Record<string, { total: number; unread: number }> = {
    inbox: { total: 0, unread: 0 },
    sent: { total: 0, unread: 0 },
    archive: { total: 0, unread: 0 },
    trash: { total: 0, unread: 0 },
  };

  for (const row of rows) {
    counts[row.folder] = {
      total: Number(row.total || 0),
      unread: Number(row.unread || 0),
    };
  }
  return counts;
}

export function storeInbound(payload: InboundPayload): Message {
  const data = unwrapInbound(payload);
  const fromRaw = data.from || "unknown@unknown";
  const from = parseAddress(fromRaw);
  const toList = [
    ...asAddressList(data.to),
    ...asAddressList(data.recipients),
  ];
  const uniqueTo = [...new Set(toList)];
  const subject = (data.subject || "(no subject)").trim();
  const bodySource = data.body || "";
  const { html, text } = sanitizeBody(bodySource);
  const now = new Date().toISOString();
  const receivedAt = data.timestamp || now;
  const id = nanoid();
  const messageId = data.messageId || id;

  const row: typeof messages.$inferInsert = {
    id,
    direction: "inbound",
    folder: "inbox",
    messageId,
    threadKey: threadKeyFor(subject, messageId),
    fromAddress: from.email,
    fromName: from.name,
    toAddresses: JSON.stringify(uniqueTo.length ? uniqueTo : [`inbox@${MAIL_DOMAIN}`]),
    subject,
    bodyHtml: html,
    bodyText: text,
    preview: htmlToPreview(text || html),
    read: false,
    starred: false,
    spamVerdict: data.spamVerdict || data.verdicts?.spam,
    virusVerdict: data.virusVerdict || data.verdicts?.virus,
    spfVerdict: data.spfVerdict || data.verdicts?.spf,
    dkimVerdict: data.dkimVerdict || data.verdicts?.dkim,
    dmarcVerdict: data.dmarcVerdict || data.verdicts?.dmarc,
    rawPayload: JSON.stringify(payload),
    receivedAt,
    createdAt: now,
  };

  db.insert(messages).values(row).run();
  return getMessage(id)!;
}

export function storeOutbound(input: {
  fromEmail: string;
  fromName?: string;
  to: string[];
  subject: string;
  bodyHtml: string;
  inReplyTo?: string;
  plunkEmailId?: string;
}): Message {
  const now = new Date().toISOString();
  const id = nanoid();
  const text = htmlToPreview(input.bodyHtml, 5000);
  const row: typeof messages.$inferInsert = {
    id,
    direction: "outbound",
    folder: "sent",
    messageId: id,
    inReplyTo: input.inReplyTo,
    threadKey: threadKeyFor(input.subject, id),
    fromAddress: input.fromEmail,
    fromName: input.fromName,
    toAddresses: JSON.stringify(input.to),
    subject: input.subject,
    bodyHtml: input.bodyHtml,
    bodyText: text,
    preview: htmlToPreview(text),
    read: true,
    starred: false,
    plunkEmailId: input.plunkEmailId,
    receivedAt: now,
    createdAt: now,
  };
  db.insert(messages).values(row).run();
  return getMessage(id)!;
}
