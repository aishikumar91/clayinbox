import { redirect } from "next/navigation";

export default async function InboxMessageRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/inbox?message=${id}`);
}
