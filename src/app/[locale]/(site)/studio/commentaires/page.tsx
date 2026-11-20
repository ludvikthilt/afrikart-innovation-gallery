import { getTranslations } from "next-intl/server";
import { CommentList, type ModeratedComment } from "@/components/moderation/comment-list";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/** Commentaires laissés sur les œuvres de l'artiste, qu'il peut masquer. */
export default async function StudioComments() {
  const me = await requireRole(["artist", "admin"], "/studio/commentaires");
  const supabase = await createClient();
  const [t, { data }] = await Promise.all([
    getTranslations("studio"),
    supabase
      .from("comments")
      .select(
        "id, body, is_hidden, created_at, author:profiles!comments_user_id_fkey(display_name), artwork:artworks!comments_artwork_id_fkey!inner(title, slug, artist_id)",
      )
      .eq("artwork.artist_id", me.id)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);
  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-serif text-4xl">{t("nav.comments")}</h1>
      <CommentList comments={(data ?? []) as unknown as ModeratedComment[]} canDelete={false} />
    </div>
  );
}
