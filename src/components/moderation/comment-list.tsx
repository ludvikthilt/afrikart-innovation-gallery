import { useFormatter, useTranslations } from "next-intl";
import { moderateComment } from "@/actions/social";
import { Link } from "@/i18n/navigation";

export type ModeratedComment = {
  id: string;
  body: string;
  is_hidden: boolean;
  created_at: string;
  author: { display_name: string } | null;
  artwork: { title: string; slug: string } | null;
};

/** Liste de commentaires avec masquer / réafficher (et supprimer pour l'admin). */
export function CommentList({ comments, canDelete }: { comments: ModeratedComment[]; canDelete: boolean }) {
  const t = useTranslations("comments");
  const format = useFormatter();
  if (comments.length === 0) return <p className="text-ink-soft">{t("empty")}</p>;
  return (
    <ul className="flex flex-col divide-y divide-hairline-soft border-y border-hairline-soft">
      {comments.map((c) => (
        <li key={c.id} className={`flex flex-col gap-2 py-4 ${c.is_hidden ? "opacity-60" : ""}`}>
          <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
            <span className="font-semibold">{c.author?.display_name}</span>
            {c.artwork && (
              <Link href={`/oeuvres/${c.artwork.slug}`} className="font-serif italic text-ink-soft hover:text-accent">
                {c.artwork.title}
              </Link>
            )}
            <time className="text-xs text-ink-muted" dateTime={c.created_at}>
              {format.dateTime(new Date(c.created_at), { dateStyle: "medium" })}
            </time>
            {c.is_hidden && <span className="label-caps text-ink-muted">{t("hidden")}</span>}
          </p>
          <p className="text-ink-soft">{c.body}</p>
          <form action={moderateComment} className="flex gap-4">
            <input type="hidden" name="id" value={c.id} />
            <button type="submit" name="action" value={c.is_hidden ? "show" : "hide"} className="text-sm text-ink-soft hover:text-ink hover:underline">
              {c.is_hidden ? t("show") : t("hide")}
            </button>
            {canDelete && (
              <button type="submit" name="action" value="delete" className="text-sm text-ink-soft hover:text-danger hover:underline">
                {t("delete")}
              </button>
            )}
          </form>
        </li>
      ))}
    </ul>
  );
}
