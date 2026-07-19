import { MessageList } from "@/components/message-list";
import { listMessages } from "@/lib/mail";

export const dynamic = "force-dynamic";

export default async function TrashPage() {
  const emails = await listMessages("trash");
  return (
    <MessageList
      emails={emails}
      folder="trash"
      title="Trash"
      emptyLabel="Deleted messages land here."
    />
  );
}
