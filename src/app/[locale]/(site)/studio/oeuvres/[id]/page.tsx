import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { deleteArtwork } from "@/actions/studio";
import { ArtworkForm } from "@/components/studio/artwork-form";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { QrIcon } from "@/components/ui/icons";
import { Link } from "@/i18n/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function EditArtwork({ params }: PageProps<"/[locale]/studio/oeuvres/[id]">) {
  const { id } = await params;
  const me = await requireRole(["artist", "admin"], `/studio/oeuvres/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const [t, { data: artwork }, { data: collections }] = await Promise.all([
    getTranslations("studio"),
    supabase.from("artworks").select("*").eq("id", id).maybeSingle(),
    supabase.from("collections").select("id, title").eq("artist_id", me.id).order("title"),
  ]);
  if (!artwork || (artwork.artist_id !== me.id && me.role !== "admin")) notFound();

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-serif text-4xl italic">{artwork.title}</h1>
        <div className="flex flex-wrap gap-2">
          <Link href={`/oeuvres/${artwork.slug}`} className="btn btn-ghost">
            {t("viewPublic")}
          </Link>
          <Link href={`/cartel/${artwork.slug}`} className="btn btn-secondary">
            <QrIcon size={16} />
            {t("qrAndLabel")}
          </Link>
        </div>
      </header>
      <ArtworkForm userId={me.id} artwork={{ ...artwork, price: artwork.price === null ? null : Number(artwork.price) }} collections={collections ?? []} />
      <form action={deleteArtwork} className="border-t border-hairline-soft pt-6">
        <input type="hidden" name="id" value={artwork.id} />
        <p className="mb-3 text-sm text-ink-muted">{t("deleteHint")}</p>
        <ConfirmButton message={t("deleteConfirm")} className="btn border border-danger/40 text-danger hover:bg-danger/10">
          {t("delete")}
        </ConfirmButton>
      </form>
    </div>
  );
}
