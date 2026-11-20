import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { Avatar } from "@/components/ui/avatar";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { requireRole } from "@/lib/auth";
import { listConversations } from "@/lib/data/messages";

export async function generateMetadata({ params }: PageProps<"/[locale]/messages">): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale as Locale, namespace: "messages" });
  return { title: t("title"), robots: { index: false } };
}

export default async function MessagesPage() {
  const me = await requireRole(["visitor", "artist", "admin"], "/messages");
  const [t, format, conversations] = await Promise.all([getTranslations("messages"), getFormatter(), listConversations(me.id)]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-12 sm:px-8">
      <h1 className="font-serif text-4xl">{t("title")}</h1>
      {conversations.length === 0 ? (
        <p className="text-ink-soft">{t("empty")}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-hairline-soft border-y border-hairline-soft">
          {conversations.map((c) => (
            <li key={c.id}>
              <Link href={`/messages/${c.id}`} className="flex items-center gap-4 py-4 hover:bg-white/[0.02]">
                <Avatar name={c.other.display_name} url={c.other.avatar_url} size={44} />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className={c.unread ? "font-semibold" : ""}>{c.other.display_name}</span>
                    <time dateTime={c.last_message_at} className="shrink-0 text-xs text-ink-muted">
                      {format.relativeTime(new Date(c.last_message_at))}
                    </time>
                  </span>
                  {c.artwork && <span className="truncate font-serif text-sm italic text-ink-soft">{c.artwork.title}</span>}
                  <span className="truncate text-sm text-ink-muted">{c.lastMessage?.body ?? t("noMessages")}</span>
                </span>
                {c.unread > 0 && (
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent font-label text-xs text-white">
                    <span className="sr-only">{t("unread", { count: c.unread })}</span>
                    <span aria-hidden="true">{c.unread}</span>
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
