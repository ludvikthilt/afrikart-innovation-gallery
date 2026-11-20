import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { ArtworkStats, VisitArtwork } from "@/lib/visit/types";

/** Colonnes d'une œuvre pour la visite / la fiche, avec artiste et collection. */
export const VISIT_ARTWORK_FIELDS = `id, slug, title, title_en, description, description_en, year, medium, medium_en,
  dimensions, image_path, image_medium_path, image_thumb_path, image_width, image_height, image_alt,
  dominant_color, for_sale, price, currency, sale_status,
  artist:profiles!artworks_artist_id_fkey(id, display_name, username, avatar_url),
  collection:collections!artworks_collection_same_artist(title, slug)`;

export function toVisitArtwork(row: unknown): VisitArtwork {
  const r = row as VisitArtwork & { price: number | string | null };
  return { ...r, price: r.price === null ? null : Number(r.price) };
}

/** Likes, commentaires et « déjà aimé » pour un lot d'œuvres, en 2 requêtes. */
export async function getArtworkStats(ids: string[], viewerId: string | null): Promise<Record<string, ArtworkStats>> {
  const out: Record<string, ArtworkStats> = {};
  if (ids.length === 0) return out;
  const supabase = await createClient();
  const [{ data: stats }, { data: mine }] = await Promise.all([
    supabase.from("artwork_stats").select("artwork_id, likes_count, comments_count").in("artwork_id", ids),
    viewerId
      ? supabase.from("likes").select("artwork_id").eq("user_id", viewerId).in("artwork_id", ids)
      : Promise.resolve({ data: [] as { artwork_id: string }[] }),
  ]);
  const liked = new Set((mine ?? []).map((l) => l.artwork_id));
  for (const id of ids) out[id] = { likes: 0, comments: 0, liked: liked.has(id) };
  for (const s of stats ?? []) {
    out[s.artwork_id] = { likes: s.likes_count, comments: s.comments_count, liked: liked.has(s.artwork_id) };
  }
  return out;
}

/** Une œuvre publiée par son slug, et sa place dans l'exposition en cours si elle y est accrochée. */
export const getArtworkBySlug = cache(async (slug: string) => {
  const supabase = await createClient();
  const { data } = await supabase.from("artworks").select(VISIT_ARTWORK_FIELDS).eq("slug", slug).maybeSingle();
  if (!data) return null;
  const artwork = toVisitArtwork(data);

  const { data: placement } = await supabase
    .from("exhibition_artworks")
    .select("exhibition:exhibitions!exhibition_artworks_exhibition_id_fkey!inner(slug, is_current)")
    .eq("artwork_id", artwork.id)
    .eq("status", "approved")
    .not("room_id", "is", null)
    .eq("exhibition.is_current", true)
    .maybeSingle();
  const exhibition = (placement?.exhibition as unknown as { slug: string } | null) ?? null;

  return { artwork, exhibitionSlug: exhibition?.slug ?? null };
});
