import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { ArtworkRow, ExhibitionRow } from "@/types/database";

export type HungArtwork = Pick<
  ArtworkRow,
  | "id"
  | "slug"
  | "title"
  | "title_en"
  | "year"
  | "medium"
  | "medium_en"
  | "image_path"
  | "image_medium_path"
  | "image_thumb_path"
  | "image_width"
  | "image_height"
  | "image_alt"
  | "dominant_color"
  | "for_sale"
  | "price"
  | "currency"
  | "sale_status"
  | "is_featured"
> & { artist: { display_name: string; username: string | null } | null };

export type HallData = {
  exhibition: Pick<
    ExhibitionRow,
    "id" | "title" | "title_en" | "slug" | "curatorial_text" | "curatorial_text_en" | "starts_at" | "ends_at" | "room_theme"
  >;
  roomsCount: number;
  artworksCount: number;
  featured: HungArtwork[];
};

const ARTWORK_FIELDS = `id, slug, title, title_en, year, medium, medium_en, image_path, image_medium_path,
  image_thumb_path, image_width, image_height, image_alt, dominant_color, for_sale, price, currency,
  sale_status, is_featured, artist:profiles!artworks_artist_id_fkey(display_name, username)`;

/** Exposition en cours + vitrine du hall (œuvres mises en avant d'abord). */
export async function getHallData(limit = 4): Promise<HallData | null> {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();

  const { data: exhibition } = await supabase
    .from("exhibitions")
    .select("id, title, title_en, slug, curatorial_text, curatorial_text_en, starts_at, ends_at, room_theme")
    .eq("is_current", true)
    .maybeSingle();
  if (!exhibition) return null;

  const [{ count: roomsCount }, { data: placements }] = await Promise.all([
    supabase.from("exhibition_rooms").select("id", { count: "exact", head: true }).eq("exhibition_id", exhibition.id),
    supabase
      .from("exhibition_artworks")
      .select(`position, artwork:artworks!exhibition_artworks_artwork_id_fkey(${ARTWORK_FIELDS})`)
      .eq("exhibition_id", exhibition.id)
      .eq("status", "approved")
      .not("room_id", "is", null)
      .order("position"),
  ]);

  const artworks = (placements ?? [])
    .map((p) => p.artwork as unknown as HungArtwork | null)
    .filter((a): a is HungArtwork => a !== null);

  const featured = [...artworks].sort((a, b) => Number(b.is_featured) - Number(a.is_featured)).slice(0, limit);

  return {
    exhibition,
    roomsCount: roomsCount ?? 0,
    artworksCount: artworks.length,
    featured,
  };
}
