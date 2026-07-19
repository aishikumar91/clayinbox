import {
  folderCounts,
  listIdentities,
  listMessages,
  type Folder,
} from "./mail";

export type MailboxLoadError = {
  code: "DATABASE_URL" | "DATABASE" | "UNKNOWN";
  message: string;
};

export async function safeListMessages(folder: Folder, query?: string) {
  try {
    return { emails: await listMessages(folder, query), error: null as MailboxLoadError | null };
  } catch (error) {
    return { emails: [], error: toMailError(error) };
  }
}

export async function safeFolderCounts() {
  try {
    return { counts: await folderCounts(), error: null as MailboxLoadError | null };
  } catch (error) {
    return {
      counts: {
        inbox: { total: 0, unread: 0 },
        sent: { total: 0, unread: 0 },
        archive: { total: 0, unread: 0 },
        trash: { total: 0, unread: 0 },
      },
      error: toMailError(error),
    };
  }
}

export async function safeListIdentities() {
  try {
    return { identities: await listIdentities(), error: null as MailboxLoadError | null };
  } catch (error) {
    return { identities: [], error: toMailError(error) };
  }
}

function toMailError(error: unknown): MailboxLoadError {
  const message = error instanceof Error ? error.message : "Unknown database error";
  if (message.includes("DATABASE_URL")) {
    return {
      code: "DATABASE_URL",
      message:
        "DATABASE_URL is missing. Add your Supabase Transaction pooler URI in Vercel env, then redeploy.",
    };
  }
  return {
    code: "DATABASE",
    message:
      "Could not reach Supabase. Confirm DATABASE_URL and that the mailbox SQL migration was run.",
  };
}
