import { notFound } from "next/navigation";
import { MessageView } from "@/components/message-view";
import { getMessage, markRead } from "@/lib/mail";

export const dynamic = "force-dynamic";

export default async function InboxMessagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const email = getMessage(id);
  if (!email || email.folder !== "inbox") notFound();
  if (!email.read) markRead(id, true);
  return <MessageView email={{ ...email, read: true }} folder="inbox" />;
}
