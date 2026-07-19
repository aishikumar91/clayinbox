import { MailApp } from "@/components/mail-app";
import { APP_NAME, MAIL_DOMAIN } from "@/lib/config";

export const dynamic = "force-dynamic";

export default function TrashPage() {
  return (
    <MailApp appName={APP_NAME} domain={MAIL_DOMAIN} initialFolder="trash" />
  );
}
