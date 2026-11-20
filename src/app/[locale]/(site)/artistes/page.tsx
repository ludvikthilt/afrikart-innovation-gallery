import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ArtImage } from "@/components/gallery/art-image";
import { Avatar } from "@/components/ui/avatar";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { listArtists } from "@/lib/data/artists";

export async function generateMetadata({ params }: PageProps<"/[locale]/artistes">): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale as Locale, namespace: "artists" });
  return { title: t("title") };
}

export default async function ArtistsPage() {
  const [t, artists] = await Promise.all([getTranslations("artists"), listArtists()]);

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-10 px-4 py-12 sm:px-8 lg:px-12">
      <header>
        <h1 className="font-serif text-4xl sm:text-5xl">{t("title")}</h1>
        <p className="mt-2 text-ink-soft">{t("intro")}</p>
      </header>
      {artists.length === 0 ? (
        <p className="text-ink-soft">{t("empty")}</p>
      ) : (
        <ul className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          {artists.map((a) => (
            <li key={a.id}>
              <Link href={`/artistes/${a.username}`} className="group flex flex-col gap-4">
                <span className="spotlight flex h-72 items-end justify-center pt-6 [container-type:inline-size]">
                  {a.cover && <ArtImage artwork={a.cover} size="thumb" alt="" maxHeight="15rem" sizes="(min-width: 1024px) 25vw, 90vw" />}
                </span>
                <span className="flex items-center gap-3">
                  <Avatar name={a.display_name} url={a.avatar_url} />
                  <span className="flex flex-col">
                    <span className="font-serif text-xl group-hover:text-accent">{a.display_name}</span>
                    <span className="text-sm text-ink-muted">
                      {[a.city, a.country].filter(Boolean).join(", ")} · {t("worksCount", { count: a.count })}
                    </span>
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
