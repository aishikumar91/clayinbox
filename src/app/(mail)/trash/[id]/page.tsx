import { notFound } from "next/navigation";
import { MessageView } from "@/components/message-view";
import { getMessage, markRead } from "@/lib/mail";

export const dynamic = "force-dynamic";

export default async function TrashMessagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const email = await getMessage(id);
  if (!email || email.folder !== "trash") notFound();
  if (!email.read) await markRead(id, true);
  return <MessageView email={{ ...email, read: true }} folder="trash" />;
}
