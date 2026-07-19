import { notFound } from "next/navigation";
import { MessageView } from "@/components/message-view";
import { getMessage } from "@/lib/mail";

export const dynamic = "force-dynamic";

export default async function SentMessagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const email = getMessage(id);
  if (!email || email.folder !== "sent") notFound();
  return <MessageView email={email} folder="sent" />;
}
