import { ComposeForm } from "@/components/compose-form";
import { getMessage, listIdentities } from "@/lib/mail";

export const dynamic = "force-dynamic";

export default async function ComposePage({
  searchParams,
}: {
  searchParams: Promise<{ replyTo?: string }>;
}) {
  const params = await searchParams;
  const identities = listIdentities();
  const replyTo = params.replyTo ? getMessage(params.replyTo) : null;

  return <ComposeForm identities={identities} replyTo={replyTo} />;
}
