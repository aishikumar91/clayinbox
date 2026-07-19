import { MessageList } from "@/components/message-list";
import { listMessages } from "@/lib/mail";

export const dynamic = "force-dynamic";

export default async function ArchivePage() {
  const emails = await listMessages("archive");
  return (
    <MessageList
      emails={emails}
      folder="archive"
      title="Archive"
      emptyLabel="Archived conversations will show up here."
    />
  );
}
