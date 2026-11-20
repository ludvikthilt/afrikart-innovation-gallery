import { getTranslations } from "next-intl/server";
import { setArtworkFlag } from "@/actions/admin";
import { CommentList, type ModeratedComment } from "@/components/moderation/comment-list";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";

/** Modération : tous les commentaires récents, et retrait d'une œuvre publiée. */
export default async function AdminModeration() {
  const supabase = await createClient();
  const [t, { data: comments }, { data: artworks }] = await Promise.all([
    getTranslations("admin"),
    supabase
      .from("comments")
      .select("id, body, is_hidden, created_at, author:profiles!comments_user_id_fkey(display_name), artwork:artworks!comments_artwork_id_fkey(title, slug)")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("artworks")
      .select("id, slug, title, artist:profiles!artworks_artist_id_fkey(display_name)")
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  return (
    <div className="flex flex-col gap-12">
      <h1 className="font-serif text-4xl">{t("nav.moderation")}</h1>
      <section className="flex flex-col gap-4">
        <h2 className="label-caps text-ink-soft">{t("recentComments")}</h2>
        <CommentList comments={(comments ?? []) as unknown as ModeratedComment[]} canDelete />
      </section>
      <section className="flex flex-col gap-4">
        <h2 className="label-caps text-ink-soft">{t("publishedArtworks")}</h2>
        <ul className="flex flex-col divide-y divide-hairline-soft border-y border-hairline-soft">
          {((artworks ?? []) as unknown as { id: string; slug: string; title: string; artist: { display_name: string } | null }[]).map((a) => (
            <li key={a.id} className="flex items-center gap-4 py-3">
              <Link href={`/oeuvres/${a.slug}`} className="flex-1 hover:text-accent">
                <span className="font-serif italic">{a.title}</span> <span className="text-sm text-ink-muted">· {a.artist?.display_name}</span>
              </Link>
              <form action={setArtworkFlag}>
                <input type="hidden" name="id" value={a.id} />
                <input type="hidden" name="flag" value="is_published" />
                <input type="hidden" name="value" value="false" />
                <ConfirmButton message={t("unpublishConfirm")} className="text-sm text-ink-soft hover:text-danger">
                  {t("unpublish")}
                </ConfirmButton>
              </form>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
