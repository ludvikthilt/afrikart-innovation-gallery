import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { artworkImageUrl } from "@/lib/images";
import { studioStatus, type StudioArtwork } from "@/lib/data/studio";

const CHIP: Record<ReturnType<typeof studioStatus>, string> = {
  sold: "border-status-sold/50 text-status-sold",
  approved: "border-status-available/50 text-status-available",
  proposed: "border-status-reserved/50 text-status-reserved",
  published: "border-accent/50 text-accent",
  draft: "border-hairline-soft text-ink-muted",
};

/** Vignettes des œuvres de l'artiste avec leur statut. */
export function StudioArtworkGrid({ artworks }: { artworks: StudioArtwork[] }) {
  const t = useTranslations("studio");
  if (artworks.length === 0) return <p className="text-ink-soft">{t("noArtworks")}</p>;
  return (
    <ul className="grid grid-cols-2 gap-5 sm:grid-cols-3 xl:grid-cols-4">
      {artworks.map((a) => {
        const status = studioStatus(a);
        return (
          <li key={a.id}>
            <Link href={`/studio/oeuvres/${a.id}`} className="group flex flex-col gap-2 rounded-sm border border-hairline-soft bg-surface p-3 hover:border-accent/60">
              <span className="relative aspect-square overflow-hidden" style={{ backgroundColor: a.dominant_color ?? "#222" }}>
                <Image src={artworkImageUrl(a, "thumb")} alt="" fill sizes="(min-width: 1280px) 20vw, 45vw" className="object-contain" />
              </span>
              <span className="truncate font-serif italic group-hover:text-accent">{a.title}</span>
              <span className="flex items-center justify-between gap-2">
                <span className={`label-caps rounded-xs border px-1.5 py-0.5 ${CHIP[status]}`}>{t(`chip.${status}`)}</span>
                <span className="font-label text-xs text-ink-muted">♥ {a.likes}</span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
