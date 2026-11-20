import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArtworkWall } from "@/components/gallery/artwork-wall";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getCollection } from "@/lib/data/artists";
import { localized } from "@/lib/format";
import { artworkImageUrl } from "@/lib/images";

type Props = PageProps<"/[locale]/collections/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const data = await getCollection(slug);
  if (!data) return {};
  const cover = data.artworks[0];
  return {
    title: `${data.collection.title} — ${data.collection.artist.display_name}`,
    description: localized(locale as Locale, data.collection.description, data.collection.description_en) ?? undefined,
    openGraph: cover ? { images: [{ url: artworkImageUrl(cover, "medium"), alt: cover.title }] } : undefined,
  };
}

export default async function CollectionPage({ params }: Props) {
  const { locale, slug } = await params;
  const [data, t] = await Promise.all([getCollection(slug), getTranslations("artists")]);
  if (!data) notFound();
  const { collection, artworks } = data;
  const description = localized(locale as Locale, collection.description, collection.description_en);

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-6 px-4 py-10 sm:px-8 lg:px-12">
      <header className="max-w-3xl">
        <p className="label-caps text-accent">{t("collection")}</p>
        <h1 className="mt-2 font-serif text-4xl italic sm:text-5xl">{collection.title}</h1>
        <p className="mt-2 text-ink-soft">
          {collection.artist.username ? (
            <Link href={`/artistes/${collection.artist.username}`} className="hover:text-accent">
              {collection.artist.display_name}
            </Link>
          ) : (
            collection.artist.display_name
          )}
          {collection.year && ` · ${collection.year}`}
        </p>
        {description && <p className="mt-4 leading-7 font-light text-ink-soft">{description}</p>}
      </header>
      <ArtworkWall emptyLabel={t("noWorks")} tabs={[{ key: "all", label: t("tabAll"), artworks }]} />
    </div>
  );
}
