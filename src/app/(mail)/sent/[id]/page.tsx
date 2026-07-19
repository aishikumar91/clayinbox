import { redirect } from "next/navigation";

export default function SentMessageRedirect() {
  redirect("/sent");
}
