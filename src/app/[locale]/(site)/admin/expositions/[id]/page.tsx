import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { deleteExhibition, deleteRoom, reviewPlacement, saveRoom } from "@/actions/admin";
import { ExhibitionForm } from "@/components/admin/exhibition-form";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Link } from "@/i18n/navigation";
import { artworkImageUrl } from "@/lib/images";
import { createClient } from "@/lib/supabase/server";
import type { ArtworkRow, ExhibitionArtworkRow } from "@/types/database";

type Thumb = Pick<ArtworkRow, "id" | "title" | "image_path" | "image_medium_path" | "image_thumb_path" | "dominant_color"> & {
  artist: { display_name: string } | null;
};

export default async function AdminExhibition({ params }: PageProps<"/[locale]/admin/expositions/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const [t, { data: exhibition }, { data: rooms }, { data: placementsData }, { data: allArtworks }] = await Promise.all([
    getTranslations("admin"),
    supabase.from("exhibitions").select("*").eq("id", id).maybeSingle(),
    supabase.from("exhibition_rooms").select("id, name, name_en, position").eq("exhibition_id", id).order("position"),
    supabase
      .from("exhibition_artworks")
      .select(
        "artwork_id, room_id, wall, status, artwork:artworks!exhibition_artworks_artwork_id_fkey(id, title, image_path, image_medium_path, image_thumb_path, dominant_color, artist:profiles!artworks_artist_id_fkey(display_name))",
      )
      .eq("exhibition_id", id),
    supabase
      .from("artworks")
      .select("id, title, image_path, image_medium_path, image_thumb_path, dominant_color, artist:profiles!artworks_artist_id_fkey(display_name)")
      .eq("is_published", true)
      .order("title"),
  ]);
  if (!exhibition) notFound();

  const placements = (placementsData ?? []) as unknown as (Pick<ExhibitionArtworkRow, "artwork_id" | "room_id" | "wall" | "status"> & {
    artwork: Thumb | null;
  })[];
  const proposed = placements.filter((p) => p.status === "proposed");
  const approved = placements.filter((p) => p.status === "approved");
  const inExpo = new Set(placements.map((p) => p.artwork_id));
  const addable = ((allArtworks ?? []) as unknown as Thumb[]).filter((a) => !inExpo.has(a.id));
  const roomName = (roomId: string | null) => rooms?.find((r) => r.id === roomId)?.name;

  return (
    <div className="flex flex-col gap-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-serif text-4xl">{exhibition.title}</h1>
        <div className="flex flex-wrap gap-2">
          <Link href={`/visite/${exhibition.slug}`} className="btn btn-secondary">
            {t("previewVisit")}
          </Link>
          <Link href={`/ecran/${exhibition.slug}`} className="btn btn-ghost">
            {t("screenMode")}
          </Link>
          {exhibition.is_current && (
            <Link href="/borne" className="btn btn-ghost">
              {t("kioskMode")}
            </Link>
          )}
        </div>
      </header>

      <ExhibitionForm exhibition={exhibition} />

      {/* Salles */}
      <section className="flex flex-col gap-4">
        <h2 className="label-caps text-ink-soft">{t("rooms")}</h2>
        <ul className="flex flex-col gap-3">
          {(rooms ?? []).map((room) => (
            <li key={room.id} className="flex flex-wrap items-end gap-3 rounded-sm border border-hairline-soft bg-surface p-4">
              <form action={saveRoom} className="flex flex-1 flex-wrap items-end gap-3">
                <input type="hidden" name="id" value={room.id} />
                <input type="hidden" name="exhibition_id" value={id} />
                <label className="field w-20">
                  <span className="field-label">{t("fields.order")}</span>
                  <input name="position" type="number" min={0} defaultValue={room.position} className="field-input" />
                </label>
                <label className="field min-w-40 flex-1">
                  <span className="field-label">{t("fields.roomName")}</span>
                  <input name="name" required maxLength={120} defaultValue={room.name} className="field-input" />
                </label>
                <label className="field min-w-40 flex-1">
                  <span className="field-label">{t("fields.roomNameEn")}</span>
                  <input name="name_en" lang="en" maxLength={120} defaultValue={room.name_en ?? ""} className="field-input" />
                </label>
                <button type="submit" className="btn btn-ghost">
                  {t("saveRoom")}
                </button>
              </form>
              <Link href={`/admin/expositions/${id}/salles/${room.id}`} className="btn btn-primary">
                {t("roomEditor")} ({approved.filter((p) => p.room_id === room.id).length})
              </Link>
              <form action={deleteRoom}>
                <input type="hidden" name="id" value={room.id} />
                <ConfirmButton message={t("deleteRoomConfirm")} className="btn btn-ghost text-danger">
                  {t("delete")}
                </ConfirmButton>
              </form>
            </li>
          ))}
        </ul>
        <form action={saveRoom} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="exhibition_id" value={id} />
          <input type="hidden" name="position" value={(rooms?.length ?? 0) + 1} />
          <label className="field min-w-48 flex-1">
            <span className="field-label">{t("fields.roomName")}</span>
            <input name="name" required maxLength={120} className="field-input" />
          </label>
          <input type="hidden" name="name_en" value="" />
          <button type="submit" className="btn btn-secondary">
            + {t("addRoom")}
          </button>
        </form>
      </section>

      {/* Propositions à valider */}
      <section className="flex flex-col gap-4">
        <h2 className="label-caps text-ink-soft">
          {t("proposals")} ({proposed.length})
        </h2>
        {proposed.length === 0 && <p className="text-sm text-ink-muted">{t("noProposals")}</p>}
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {proposed.map((p) => p.artwork && (
            <li key={p.artwork_id} className="flex items-center gap-3 rounded-sm border border-hairline-soft bg-surface p-3">
              <ArtThumb artwork={p.artwork} />
              <form action={reviewPlacement} className="flex flex-col gap-2">
                <input type="hidden" name="exhibitionId" value={id} />
                <input type="hidden" name="artworkId" value={p.artwork_id} />
                <div className="flex gap-2">
                  <button type="submit" name="decision" value="approve" className="btn btn-primary min-h-8 px-3">
                    {t("validate")}
                  </button>
                  <button type="submit" name="decision" value="reject" className="btn btn-secondary min-h-8 px-3">
                    {t("reject")}
                  </button>
                </div>
              </form>
            </li>
          ))}
        </ul>
      </section>

      {/* Œuvres validées */}
      <section className="flex flex-col gap-4">
        <h2 className="label-caps text-ink-soft">
          {t("validated")} ({approved.length})
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {approved.map((p) => p.artwork && (
            <li key={p.artwork_id} className="flex items-center gap-3 rounded-sm border border-hairline-soft p-3">
              <ArtThumb artwork={p.artwork} />
              <span className="label-caps ml-auto text-right text-ink-muted">
                {p.room_id && p.wall ? `${roomName(p.room_id)} · ${t(`wall.${p.wall}`)}` : t("notHung")}
              </span>
              <form action={reviewPlacement}>
                <input type="hidden" name="exhibitionId" value={id} />
                <input type="hidden" name="artworkId" value={p.artwork_id} />
                <button type="submit" name="decision" value="remove" aria-label={t("removeFromExhibition")} className="px-2 text-ink-muted hover:text-danger">
                  ×
                </button>
              </form>
            </li>
          ))}
        </ul>
        {addable.length > 0 && (
          <details className="rounded-sm border border-dashed border-hairline">
            <summary className="cursor-pointer px-4 py-3 text-sm text-ink-soft">+ {t("addArtworks")}</summary>
            <ul className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
              {addable.map((a) => (
                <li key={a.id} className="flex items-center gap-3">
                  <ArtThumb artwork={a} />
                  <form action={reviewPlacement} className="ml-auto">
                    <input type="hidden" name="exhibitionId" value={id} />
                    <input type="hidden" name="artworkId" value={a.id} />
                    <button type="submit" name="decision" value="add" className="btn btn-ghost min-h-8">
                      {t("add")}
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>

      <form action={deleteExhibition} className="border-t border-hairline-soft pt-6">
        <input type="hidden" name="id" value={id} />
        <ConfirmButton message={t("deleteExhibitionConfirm")} className="btn border border-danger/40 text-danger hover:bg-danger/10">
          {t("deleteExhibition")}
        </ConfirmButton>
      </form>
    </div>
  );
}

function ArtThumb({ artwork }: { artwork: Thumb }) {
  return (
    <span className="flex min-w-0 items-center gap-3">
      <span className="relative size-12 shrink-0 overflow-hidden" style={{ backgroundColor: artwork.dominant_color ?? "#222" }}>
        <Image src={artworkImageUrl(artwork, "thumb")} alt="" fill sizes="48px" className="object-cover" />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="truncate font-serif italic">{artwork.title}</span>
        <span className="truncate text-xs text-ink-muted">{artwork.artist?.display_name}</span>
      </span>
    </span>
  );
}
