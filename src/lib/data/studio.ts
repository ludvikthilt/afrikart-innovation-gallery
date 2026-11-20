import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { ArtworkRow, PlacementStatus } from "@/types/database";

export type StudioArtwork = ArtworkRow & {
  placements: { status: PlacementStatus; exhibition_id: string }[];
  likes: number;
};

/** Toutes les œuvres de l'artiste (y compris brouillons), avec leurs propositions et likes. */
export async function getMyArtworks(userId: string): Promise<StudioArtwork[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("artworks")
    .select("*, placements:exhibition_artworks!exhibition_artworks_artwork_id_fkey(status, exhibition_id)")
    .eq("artist_id", userId)
    .order("created_at", { ascending: false });
  const artworks = (data ?? []) as unknown as (ArtworkRow & { placements: StudioArtwork["placements"] })[];
  if (artworks.length === 0) return [];
  const { data: stats } = await supabase
    .from("artwork_stats")
    .select("artwork_id, likes_count")
    .in(
      "artwork_id",
      artworks.map((a) => a.id),
    );
  return artworks.map((a) => ({
    ...a,
    price: a.price === null ? null : Number(a.price),
    likes: stats?.find((s) => s.artwork_id === a.id)?.likes_count ?? 0,
  }));
}

/** Statut affiché sur la vignette du studio, du plus parlant au plus neutre. */
export function studioStatus(a: StudioArtwork): "sold" | "approved" | "proposed" | "published" | "draft" {
  if (a.sale_status === "sold") return "sold";
  if (a.placements.some((p) => p.status === "approved")) return "approved";
  if (a.placements.some((p) => p.status === "proposed")) return "proposed";
  return a.is_published ? "published" : "draft";
}
