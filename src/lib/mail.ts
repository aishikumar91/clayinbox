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
  return (
    subject.replace(/^(re|fwd|fw):\s*/i, "").trim().toLowerCase() ||
    "(no subject)"
  );
}

export function threadKeyFor(subject: string, fallbackId: string): string {
  const normalized = normalizeSubject(subject);
  return normalized === "(no subject)"
    ? `id:${fallbackId}`
    : `subj:${normalized}`;
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

export async function ensureDefaultIdentities() {
  const existing = await db.select().from(identities);
  const now = new Date().toISOString();
  const infoEmail = `info@${MAIL_DOMAIN}`;

  if (existing.length === 0) {
    const defaults = [
      {
        id: nanoid(),
        email: infoEmail,
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
        email: `hello@${MAIL_DOMAIN}`,
        displayName: "Clay Hello",
        isDefault: false,
        createdAt: now,
      },
    ];
    await db.insert(identities).values(defaults);
    return defaults;
  }

  const hasInfo = existing.some((row) => row.email === infoEmail);
  if (!hasInfo) {
    await db.insert(identities).values({
      id: nanoid(),
      email: infoEmail,
      displayName: "Clay Services",
      isDefault: true,
      createdAt: now,
    });
  }

  // Prefer info@ as the default sender.
  await db.update(identities).set({ isDefault: false });
  await db
    .update(identities)
    .set({ isDefault: true, displayName: "Clay Services" })
    .where(eq(identities.email, infoEmail));

  return db.select().from(identities).orderBy(desc(identities.isDefault));
}

export async function listIdentities() {
  return ensureDefaultIdentities();
}

export async function listMessages(folder: Folder, query?: string) {
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
    .orderBy(desc(messages.receivedAt));
}

export async function getMessage(id: string): Promise<Message | undefined> {
  const rows = await db.select().from(messages).where(eq(messages.id, id)).limit(1);
  return rows[0];
}

export async function markRead(id: string, read = true) {
  await db.update(messages).set({ read }).where(eq(messages.id, id));
}

export async function moveMessage(id: string, folder: Folder) {
  await db.update(messages).set({ folder }).where(eq(messages.id, id));
}

export async function folderCounts() {
  const rows = await db
    .select({
      folder: messages.folder,
      total: sql<number>`count(*)::int`,
      unread: sql<number>`coalesce(sum(case when ${messages.read} = false then 1 else 0 end), 0)::int`,
    })
    .from(messages)
    .groupBy(messages.folder);

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

export async function storeInbound(payload: InboundPayload): Promise<Message> {
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
    toAddresses: JSON.stringify(
      uniqueTo.length ? uniqueTo : [`inbox@${MAIL_DOMAIN}`],
    ),
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

  await db.insert(messages).values(row);
  const stored = await getMessage(id);
  if (!stored) {
    throw new Error("Failed to store inbound message");
  }
  return stored;
}

export async function storeOutbound(input: {
  fromEmail: string;
  fromName?: string;
  to: string[];
  subject: string;
  bodyHtml: string;
  inReplyTo?: string;
  plunkEmailId?: string;
}): Promise<Message> {
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
  await db.insert(messages).values(row);
  const stored = await getMessage(id);
  if (!stored) {
    throw new Error("Failed to store outbound message");
  }
  return stored;
}
