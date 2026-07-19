import { MessageList } from "@/components/message-list";
import { listMessages } from "@/lib/mail";

export const dynamic = "force-dynamic";

export default function ArchivePage() {
  const emails = listMessages("archive");
  return (
    <MessageList
      emails={emails}
      folder="archive"
      title="Archive"
      emptyLabel="Archived conversations will show up here."
    />
  );
}
