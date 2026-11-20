import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { preload } from "react-dom";
import { getTranslations } from "next-intl/server";
import { ComingSoon } from "@/components/ui/coming-soon";
import { VisitExperience } from "@/components/visit/visit-experience";
import type { Locale } from "@/i18n/routing";
import { getCurrentProfile } from "@/lib/auth";
import { getArtworkStats } from "@/lib/data/artworks";
import { getVisit } from "@/lib/data/visit";
import { localized } from "@/lib/format";
import { artworkImageUrl } from "@/lib/images";
import { getRates } from "@/lib/rates";
import { locate, positionFromQuery } from "@/lib/visit/navigation";

type Props = PageProps<"/[locale]/visite/[expoSlug]">;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? null;

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const [{ locale, expoSlug }, query] = await Promise.all([params, searchParams]);
  const visit = await getVisit(expoSlug);
  if (!visit) return {};
  const title = localized(locale as Locale, visit.title, visit.title_en);
  // Lien partagé vers une œuvre précise : son image en aperçu.
  const slug = first(query.oeuvre);
  const stop = slug ? locate(visit, slug) : undefined;
  const artwork = stop ? visit.rooms[stop.room].walls[stop.wall].artworks[stop.spot] : visit.rooms[0]?.walls[0]?.artworks[0];
  return {
    title: stop && artwork ? `${localized(locale as Locale, artwork.title, artwork.title_en)} — ${title}` : title,
    openGraph: artwork ? { images: [{ url: artworkImageUrl(artwork, "medium"), alt: artwork.title }] } : undefined,
  };
}

export default async function VisitPage({ params, searchParams }: Props) {
  const [{ expoSlug }, query] = await Promise.all([params, searchParams]);
  const [visit, profile, rates, t] = await Promise.all([getVisit(expoSlug), getCurrentProfile(), getRates(), getTranslations("visit")]);
  if (!visit) notFound();
  if (visit.rooms.length === 0) return <ComingSoon title={t("emptyExhibition")} />;

  const ids = visit.rooms.flatMap((r) => r.walls.flatMap((w) => w.artworks.map((a) => a.id)));
  const stats = await getArtworkStats(ids, profile?.id ?? null);
  const initial = positionFromQuery(visit, { salle: first(query.salle), mur: first(query.mur), oeuvre: first(query.oeuvre) });

  // Les images du mur d'arrivée partent dès la réception du HTML, sans attendre le JavaScript de la visite.
  for (const artwork of visit.rooms[initial.room]?.walls[initial.wall]?.artworks ?? []) {
    preload(artworkImageUrl(artwork, "medium"), { as: "image", fetchPriority: "high" });
  }

  return (
    <VisitExperience
      exhibition={visit}
      initial={initial}
      stats={stats}
      rates={rates}
      viewer={profile ? { id: profile.id, role: profile.role } : null}
    />
  );
}
