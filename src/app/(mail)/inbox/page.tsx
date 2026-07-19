import { MessageList } from "@/components/message-list";
import { listMessages } from "@/lib/mail";

export const dynamic = "force-dynamic";

export default function InboxPage() {
  const emails = listMessages("inbox");
  return (
    <MessageList
      emails={emails}
      folder="inbox"
      title="Inbox"
      emptyLabel="When Plunk delivers inbound mail to the webhook, messages will appear here."
    />
  );
}
