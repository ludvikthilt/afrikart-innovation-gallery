import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { RoomEditor, type EditorArtwork } from "@/components/admin/room-editor";
import { ChevronLeftIcon } from "@/components/ui/icons";
import { Link } from "@/i18n/navigation";
import { artworkImageUrl } from "@/lib/images";
import { createClient } from "@/lib/supabase/server";
import type { ArtworkRow, WallSide } from "@/types/database";

type Placement = {
  artwork_id: string;
  room_id: string | null;
  wall: WallSide | null;
  position: number;
  artwork: (Pick<ArtworkRow, "title" | "image_path" | "image_medium_path" | "image_thumb_path" | "image_width" | "image_height" | "dominant_color"> & {
    artist: { display_name: string } | null;
  }) | null;
};

export default async function RoomEditorPage({ params }: PageProps<"/[locale]/admin/expositions/[id]/salles/[roomId]">) {
  const { id, roomId } = await params;
  const supabase = await createClient();
  const [t, { data: exhibition }, { data: room }, { data }] = await Promise.all([
    getTranslations("admin"),
    supabase.from("exhibitions").select("id, title, room_theme").eq("id", id).maybeSingle(),
    supabase.from("exhibition_rooms").select("id, name").eq("id", roomId).eq("exhibition_id", id).maybeSingle(),
    supabase
      .from("exhibition_artworks")
      .select(
        "artwork_id, room_id, wall, position, artwork:artworks!exhibition_artworks_artwork_id_fkey(title, image_path, image_medium_path, image_thumb_path, image_width, image_height, dominant_color, artist:profiles!artworks_artist_id_fkey(display_name))",
      )
      .eq("exhibition_id", id)
      .eq("status", "approved")
      .order("position"),
  ]);
  if (!exhibition || !room) notFound();

  // Œuvres de cette salle + œuvres validées pas encore accrochées.
  const placements = ((data ?? []) as unknown as Placement[]).filter((p) => p.artwork && (p.room_id === roomId || p.room_id === null));
  const artworks: EditorArtwork[] = placements.map((p) => ({
    id: p.artwork_id,
    title: p.artwork!.title,
    artist: p.artwork!.artist?.display_name ?? "",
    thumb: artworkImageUrl(p.artwork!, "thumb"),
    ratio: p.artwork!.image_width / p.artwork!.image_height,
    color: p.artwork!.dominant_color,
  }));
  const initial = Object.fromEntries(
    (["north", "east", "south", "west"] as WallSide[]).map((w) => [
      w,
      placements.filter((p) => p.room_id === roomId && p.wall === w).map((p) => p.artwork_id),
    ]),
  ) as Record<WallSide, string[]>;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <Link href={`/admin/expositions/${id}`} className="flex items-center gap-1 text-sm text-ink-soft hover:text-ink">
          <ChevronLeftIcon size={14} />
          {exhibition.title}
        </Link>
        <h1 className="font-serif text-4xl">
          {t("roomEditor")} — {room.name}
        </h1>
      </header>
      <RoomEditor exhibitionId={id} roomId={roomId} theme={exhibition.room_theme} artworks={artworks} initial={initial} />
    </div>
  );
}
