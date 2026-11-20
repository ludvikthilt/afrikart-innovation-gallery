import { getTranslations } from "next-intl/server";
import { StudioArtworkGrid } from "@/components/studio/studio-artwork-grid";
import { Link } from "@/i18n/navigation";
import { requireRole } from "@/lib/auth";
import { getMyArtworks } from "@/lib/data/studio";

export default async function StudioArtworks() {
  const me = await requireRole(["artist", "admin"], "/studio/oeuvres");
  const [t, artworks] = await Promise.all([getTranslations("studio"), getMyArtworks(me.id)]);
  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-serif text-4xl">{t("nav.artworks")}</h1>
        <Link href="/studio/oeuvres/nouvelle" className="btn btn-primary">
          + {t("addArtwork")}
        </Link>
      </header>
      <StudioArtworkGrid artworks={artworks} />
    </div>
  );
}
