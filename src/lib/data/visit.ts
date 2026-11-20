import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { WallSide } from "@/types/database";
import type { VisitExhibition, VisitRoom } from "@/lib/visit/types";
import { toVisitArtwork, VISIT_ARTWORK_FIELDS } from "./artworks";

const WALL_ORDER: WallSide[] = ["north", "east", "south", "west"];

/**
 * Exposition prête à visiter : salles → murs non vides (N, E, S, O) → œuvres
 * validées dans l'ordre d'accrochage. Les salles vides sont ignorées.
 */
export const getVisit = cache(async (slug: string): Promise<VisitExhibition | null> => {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();

  const { data: exhibition } = await supabase
    .from("exhibitions")
    .select("id, slug, title, title_en, room_theme")
    .eq("slug", slug)
    .maybeSingle();
  if (!exhibition) return null;

  const [{ data: rooms }, { data: placements }] = await Promise.all([
    supabase.from("exhibition_rooms").select("id, name, name_en, position").eq("exhibition_id", exhibition.id).order("position"),
    supabase
      .from("exhibition_artworks")
      .select(`room_id, wall, position, artwork:artworks!exhibition_artworks_artwork_id_fkey(${VISIT_ARTWORK_FIELDS})`)
      .eq("exhibition_id", exhibition.id)
      .eq("status", "approved")
      .not("room_id", "is", null)
      .order("position"),
  ]);

  const visitRooms: VisitRoom[] = (rooms ?? [])
    .map((room) => ({
      id: room.id,
      name: room.name,
      name_en: room.name_en,
      walls: WALL_ORDER.map((side) => ({
        side,
        artworks: (placements ?? [])
          .filter((p) => p.room_id === room.id && p.wall === side && p.artwork)
          .map((p) => toVisitArtwork(p.artwork)),
      })).filter((w) => w.artworks.length > 0),
    }))
    .filter((r) => r.walls.length > 0);

  return { ...exhibition, rooms: visitRooms };
});

/** Slug de l'exposition en cours (bouton « Voir dans la galerie », borne). */
export async function getCurrentExhibitionSlug(): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("exhibitions").select("slug").eq("is_current", true).maybeSingle();
  return data?.slug ?? null;
}
