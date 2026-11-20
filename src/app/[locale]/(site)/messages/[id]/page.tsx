import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Thread } from "@/components/messages/thread";
import { Avatar } from "@/components/ui/avatar";
import { ChevronLeftIcon } from "@/components/ui/icons";
import { Link } from "@/i18n/navigation";
import { requireRole } from "@/lib/auth";
import { getConversation } from "@/lib/data/messages";

type Props = PageProps<"/[locale]/messages/[id]">;

export const metadata: Metadata = { robots: { index: false } };

export default async function ConversationPage({ params, searchParams }: Props) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const me = await requireRole(["visitor", "artist", "admin"], `/messages/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [conversation, t] = await Promise.all([getConversation(id, me.id), getTranslations("messages")]);
  if (!conversation) notFound();

  // « Je suis intéressé·e » : message pré-rempli, que le visiteur peut modifier.
  const draft =
    query.brouillon === "interet" && conversation.messages.length === 0 && conversation.artwork
      ? t("interestDraft", { title: conversation.artwork.title })
      : "";

  return (
    <div className="mx-auto flex h-[calc(100dvh-4rem)] w-full max-w-3xl flex-col">
      <header className="flex items-center gap-3 border-b border-hairline-soft px-4 py-3 sm:px-8">
        <Link href="/messages" aria-label={t("back")} className="btn btn-ghost min-h-10 px-2">
          <ChevronLeftIcon />
        </Link>
        <Avatar name={conversation.other.display_name} url={conversation.other.avatar_url} />
        <div className="flex min-w-0 flex-col">
          <h1 className="truncate font-semibold">{conversation.other.display_name}</h1>
          {conversation.artwork && (
            <Link href={`/oeuvres/${conversation.artwork.slug}`} className="truncate font-serif text-sm italic text-ink-soft hover:text-accent">
              {conversation.artwork.title}
            </Link>
          )}
        </div>
      </header>
      <Thread conversationId={conversation.id} meId={me.id} initial={conversation.messages} draft={draft} />
    </div>
  );
}
