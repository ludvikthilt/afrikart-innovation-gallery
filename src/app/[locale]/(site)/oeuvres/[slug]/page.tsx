import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArtworkPanel } from "@/components/artwork/artwork-panel";
import { ArrowRightIcon } from "@/components/ui/icons";
import { ZoomViewer } from "@/components/visit/zoom-viewer";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getCurrentProfile } from "@/lib/auth";
import { getArtworkBySlug, getArtworkStats } from "@/lib/data/artworks";
import { localized } from "@/lib/format";
import { artworkImageUrl } from "@/lib/images";
import { getRates } from "@/lib/rates";
import { isSupabaseConfigured } from "@/lib/supabase/env";

type Props = PageProps<"/[locale]/oeuvres/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isSupabaseConfigured) return {};
  const found = await getArtworkBySlug(slug);
  if (!found) return {};
  const { artwork } = found;
  const title = `${localized(locale as Locale, artwork.title, artwork.title_en)} — ${artwork.artist.display_name}`;
  const description = localized(locale as Locale, artwork.description, artwork.description_en) ?? undefined;
  const image = { url: artworkImageUrl(artwork, "medium"), width: artwork.image_width, height: artwork.image_height, alt: artwork.title };
  return {
    title,
    description,
    alternates: { canonical: `/oeuvres/${slug}` },
    openGraph: { title, description, type: "article", images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [image.url] },
  };
}

/** Fiche plein cadre : la cible des QR codes du salon physique. */
export default async function ArtworkPage({ params }: Props) {
  const { locale, slug } = await params;
  if (!isSupabaseConfigured) notFound();
  const [found, profile, rates, t] = await Promise.all([
    getArtworkBySlug(slug),
    getCurrentProfile(),
    getRates(),
    getTranslations({ locale: locale as Locale, namespace: "artwork" }),
  ]);
  if (!found) notFound();
  const { artwork, exhibitionSlug } = found;
  const stats = (await getArtworkStats([artwork.id], profile?.id ?? null))[artwork.id];
  const title = localized(locale as Locale, artwork.title, artwork.title_en);

  return (
    // md:flex-none : un élément flex-1 n'a pas de hauteur « définie », le h-full des enfants ne se résoudrait pas.
    <div className="flex flex-1 flex-col md:h-[calc(100svh-4rem)] md:flex-none md:flex-row">
      <section aria-label={title} className="relative h-[58svh] w-full md:h-[calc(100svh-4rem)] md:w-[62%]">
        <ZoomViewer artwork={artwork} alt={artwork.image_alt ?? title} />
      </section>
      <div className="flex w-full flex-col border-hairline md:w-[38%] md:overflow-y-auto md:border-l">
        <div className="flex flex-col gap-6 px-5 py-8 sm:px-8">
          {exhibitionSlug && (
            <Link
              href={{ pathname: `/visite/${exhibitionSlug}`, query: { oeuvre: artwork.slug } }}
              className="btn btn-secondary self-start"
            >
              {t("seeInGallery")}
              <ArrowRightIcon size={16} />
            </Link>
          )}
          <ArtworkPanel
            artwork={artwork}
            stats={stats}
            rates={rates}
            viewer={profile ? { id: profile.id, role: profile.role } : null}
            returnPath={`/oeuvres/${artwork.slug}`}
            headingLevel="h1"
          />
        </div>
      </div>
    </div>
  );
}
