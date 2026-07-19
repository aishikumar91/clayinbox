import { MessageList } from "@/components/message-list";
import { listMessages } from "@/lib/mail";

export const dynamic = "force-dynamic";

export default async function SentPage() {
  const emails = await listMessages("sent");
  return (
    <MessageList
      emails={emails}
      folder="sent"
      title="Sent"
      emptyLabel="Outbound mail sent through Plunk will be stored in this folder."
    />
  );
}
