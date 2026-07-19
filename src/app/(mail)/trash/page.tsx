import { MessageList } from "@/components/message-list";
import { listMessages } from "@/lib/mail";

export const dynamic = "force-dynamic";

export default function TrashPage() {
  const emails = listMessages("trash");
  return (
    <MessageList
      emails={emails}
      folder="trash"
      title="Trash"
      emptyLabel="Deleted messages land here."
    />
  );
}
