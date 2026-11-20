import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { contactArtist } from "@/actions/social";
import { ArtworkWall } from "@/components/gallery/artwork-wall";
import { Avatar } from "@/components/ui/avatar";
import { MessageIcon } from "@/components/ui/icons";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getCurrentProfile } from "@/lib/auth";
import { getArtist } from "@/lib/data/artists";
import { localized } from "@/lib/format";
import { artworkImageUrl } from "@/lib/images";

type Props = PageProps<"/[locale]/artistes/[username]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, username } = await params;
  const data = await getArtist(username);
  if (!data) return {};
  const description = localized(locale as Locale, data.artist.bio, data.artist.bio_en)?.slice(0, 200);
  const cover = data.artworks[0];
  return {
    title: data.artist.display_name,
    description,
    openGraph: {
      title: data.artist.display_name,
      description,
      type: "profile",
      images: cover ? [{ url: artworkImageUrl(cover, "medium"), alt: cover.title }] : undefined,
    },
  };
}

/** Le mur personnel de l'artiste : portrait et bio à gauche, ses œuvres à droite. */
export default async function ArtistPage({ params }: Props) {
  const { locale, username } = await params;
  const [data, viewer, t] = await Promise.all([getArtist(username), getCurrentProfile(), getTranslations("artists")]);
  if (!data) notFound();
  const { artist, artworks, collections, exhibitionsCount } = data;
  const bio = localized(locale as Locale, artist.bio, artist.bio_en);
  const socials = Object.entries((artist.socials ?? {}) as Record<string, string>).filter(([, url]) => typeof url === "string" && url.startsWith("http"));

  return (
    <div className="mx-auto grid w-full max-w-[1600px] flex-1 gap-10 px-4 py-10 sm:px-8 lg:grid-cols-[1fr_2fr] lg:px-12">
      <aside className="flex flex-col gap-5 lg:sticky lg:top-24 lg:self-start">
        <Avatar name={artist.display_name} url={artist.avatar_url} size={112} />
        <div>
          <h1 className="font-serif text-4xl sm:text-5xl">{artist.display_name}</h1>
          {(artist.city || artist.country) && (
            <p className="label-caps mt-2 text-ink-muted">{[artist.city, artist.country].filter(Boolean).join(", ")}</p>
          )}
        </div>
        {bio && <p className="leading-7 font-light whitespace-pre-line text-ink-soft">{bio}</p>}
        <p className="label-caps text-ink-soft">
          {t("stats", { works: artworks.length, collections: collections.length, exhibitions: exhibitionsCount })}
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
          {artist.website && (
            <a href={artist.website} target="_blank" rel="noopener noreferrer" className="text-ink-soft hover:text-accent">
              {t("website")}
            </a>
          )}
          {socials.map(([name, url]) => (
            <a key={name} href={url} target="_blank" rel="noopener noreferrer" className="text-ink-soft capitalize hover:text-accent">
              {name}
            </a>
          ))}
        </div>
        {viewer?.id !== artist.id && (
          <form action={contactArtist}>
            <input type="hidden" name="artistId" value={artist.id} />
            <input type="hidden" name="intent" value="contact" />
            <input type="hidden" name="from" value={`/artistes/${username}`} />
            <button type="submit" className="btn btn-secondary">
              <MessageIcon size={16} />
              {t("contact")}
            </button>
          </form>
        )}
        {collections.length > 0 && (
          <nav aria-label={t("collections")} className="flex flex-col gap-2">
            <h2 className="label-caps text-ink-muted">{t("collections")}</h2>
            {collections.map((c) => (
              <Link key={c.id} href={`/collections/${c.slug}`} className="font-serif text-lg italic hover:text-accent">
                {c.title} {c.year && <span className="font-sans text-sm not-italic text-ink-muted">· {c.year}</span>}
              </Link>
            ))}
          </nav>
        )}
      </aside>

      <section aria-label={t("works")} className="min-w-0">
        <ArtworkWall
          emptyLabel={t("noWorks")}
          tabs={[
            { key: "all", label: t("tabAll"), artworks },
            { key: "collections", label: t("tabCollections"), artworks: artworks.filter((a) => a.collection_id) },
            { key: "solo", label: t("tabSolo"), artworks: artworks.filter((a) => !a.collection_id) },
            { key: "sale", label: t("tabForSale"), artworks: artworks.filter((a) => a.for_sale && a.sale_status !== "sold") },
          ].filter((tab) => tab.key === "all" || (tab.artworks.length > 0 && tab.artworks.length < artworks.length))}
        />
      </section>
    </div>
  );
}
