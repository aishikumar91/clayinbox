import { MailboxShell } from "@/components/mailbox-shell";
import { APP_NAME, MAIL_DOMAIN } from "@/lib/config";
import { folderCounts } from "@/lib/mail";

export default function MailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const counts = folderCounts();

  return (
    <MailboxShell appName={APP_NAME} domain={MAIL_DOMAIN} counts={counts}>
      {children}
    </MailboxShell>
  );
}
