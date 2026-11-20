import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { VisitArtwork } from "@/lib/visit/types";
import { toVisitArtwork, VISIT_ARTWORK_FIELDS } from "./artworks";

export type ArtistSummary = {
  id: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
  city: string | null;
  country: string | null;
  cover: VisitArtwork | null;
  count: number;
};

/** Artistes ayant au moins une œuvre publiée, avec une œuvre de couverture. */
export async function listArtists(): Promise<ArtistSummary[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const [{ data: artists }, { data: artworks }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, display_name, username, avatar_url, city, country")
      .eq("role", "artist")
      .not("username", "is", null)
      .order("display_name"),
    supabase.from("artworks").select(VISIT_ARTWORK_FIELDS).eq("is_published", true).order("is_featured", { ascending: false }),
  ]);
  const works = (artworks ?? []).map(toVisitArtwork);
  return (artists ?? [])
    .map((a) => {
      const own = works.filter((w) => w.artist.id === a.id);
      return { ...a, username: a.username!, cover: own[0] ?? null, count: own.length };
    })
    .filter((a) => a.count > 0);
}

export const getArtist = cache(async (username: string) => {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const { data: artist } = await supabase
    .from("profiles")
    .select("id, display_name, username, avatar_url, bio, bio_en, city, country, website, socials, role")
    .eq("username", username)
    .in("role", ["artist", "admin"])
    .maybeSingle();
  if (!artist) return null;

  const [{ data: artworks }, { data: collections }, { data: placements }] = await Promise.all([
    supabase
      .from("artworks")
      .select(`${VISIT_ARTWORK_FIELDS}, collection_id`)
      .eq("artist_id", artist.id)
      .eq("is_published", true)
      .order("year", { ascending: false }),
    supabase
      .from("collections")
      .select("id, title, slug, year, description, description_en, cover_artwork_id")
      .eq("artist_id", artist.id)
      .eq("is_published", true)
      .order("year", { ascending: false }),
    supabase
      .from("exhibition_artworks")
      .select("exhibition_id, artwork:artworks!exhibition_artworks_artwork_id_fkey!inner(artist_id)")
      .eq("artwork.artist_id", artist.id)
      .eq("status", "approved"),
  ]);

  return {
    artist,
    artworks: (artworks ?? []).map((a) => ({ ...toVisitArtwork(a), collection_id: (a as { collection_id: string | null }).collection_id })),
    collections: collections ?? [],
    // Expositions distinctes (une exposition compte une fois, quel que soit le nombre d'œuvres).
    exhibitionsCount: new Set((placements ?? []).map((p) => p.exhibition_id)).size,
  };
});

export const getCollection = cache(async (slug: string) => {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const { data: collection } = await supabase
    .from("collections")
    .select("id, title, slug, year, description, description_en, artist:profiles!collections_artist_id_fkey(id, display_name, username)")
    .eq("slug", slug)
    .maybeSingle();
  if (!collection) return null;
  const { data: artworks } = await supabase
    .from("artworks")
    .select(VISIT_ARTWORK_FIELDS)
    .eq("collection_id", collection.id)
    .eq("is_published", true)
    .order("year");
  return {
    collection: collection as typeof collection & { artist: { id: string; display_name: string; username: string | null } },
    artworks: (artworks ?? []).map(toVisitArtwork),
  };
});

/** Expositions publiées : en cours d'abord, puis les archives. */
export async function listExhibitions() {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("exhibitions")
    .select(
      `id, slug, title, title_en, curatorial_text, curatorial_text_en, starts_at, ends_at, is_current, room_theme,
       exhibition_artworks(status, artwork:artworks!exhibition_artworks_artwork_id_fkey(image_path, image_medium_path, image_thumb_path, image_width, image_height, dominant_color, title, image_alt))`,
    )
    .eq("is_published", true)
    .order("is_current", { ascending: false })
    .order("starts_at", { ascending: false });
  return (data ?? []).map((e) => {
    const placements = (e.exhibition_artworks ?? []) as unknown as {
      status: string;
      artwork: (VisitArtwork & { title: string }) | null;
    }[];
    const approved = placements.filter((p) => p.status === "approved" && p.artwork);
    return { ...e, cover: approved[0]?.artwork ?? null, count: approved.length };
  });
}
