import { getTranslations } from "next-intl/server";
import { StudioArtworkGrid } from "@/components/studio/studio-artwork-grid";
import { Link } from "@/i18n/navigation";
import { requireRole } from "@/lib/auth";
import { countUnread } from "@/lib/data/messages";
import { getMyArtworks } from "@/lib/data/studio";

export default async function StudioDashboard() {
  const me = await requireRole(["artist", "admin"], "/studio");
  const [t, artworks, unread] = await Promise.all([getTranslations("studio"), getMyArtworks(me.id), countUnread(me.id)]);
  const tiles = [
    { label: t("stats.likes"), value: artworks.reduce((n, a) => n + a.likes, 0) },
    { label: t("stats.unread"), value: unread },
    { label: t("stats.forSale"), value: artworks.filter((a) => a.for_sale && a.sale_status !== "sold").length },
    { label: t("stats.published"), value: artworks.filter((a) => a.is_published).length },
  ];

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-serif text-4xl">{t("hello", { name: me.display_name.split(" ")[0] })}</h1>
        <Link href="/studio/oeuvres/nouvelle" className="btn btn-primary">
          + {t("addArtwork")}
        </Link>
      </header>
      <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tiles.map((tile) => (
          <div key={tile.label} className="flex flex-col gap-1 rounded-sm border border-hairline-soft bg-surface p-5">
            <dt className="label-caps text-ink-muted">{tile.label}</dt>
            <dd className="font-label text-3xl">{tile.value}</dd>
          </div>
        ))}
      </dl>
      <section className="flex flex-col gap-4">
        <h2 className="label-caps text-ink-soft">{t("nav.artworks")}</h2>
        <StudioArtworkGrid artworks={artworks.slice(0, 8)} />
      </section>
    </div>
  );
}
