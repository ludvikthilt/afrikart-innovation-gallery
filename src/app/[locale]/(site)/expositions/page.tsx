import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ArtImage } from "@/components/gallery/art-image";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { listExhibitions } from "@/lib/data/artists";
import { formatDateRange, localized } from "@/lib/format";

export async function generateMetadata({ params }: PageProps<"/[locale]/expositions">): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale as Locale, namespace: "exhibitions" });
  return { title: t("title") };
}

/** Exposition en cours et archives, toujours visitables. */
export default async function ExhibitionsPage({ params }: PageProps<"/[locale]/expositions">) {
  const locale = (await params).locale as Locale;
  const [t, th, exhibitions] = await Promise.all([
    getTranslations({ locale, namespace: "exhibitions" }),
    getTranslations({ locale, namespace: "hall" }),
    listExhibitions(),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-10 px-4 py-12 sm:px-8 lg:px-12">
      <h1 className="font-serif text-4xl sm:text-5xl">{t("title")}</h1>
      {exhibitions.length === 0 ? (
        <p className="text-ink-soft">{t("empty")}</p>
      ) : (
        <ul className="grid gap-x-10 gap-y-14 md:grid-cols-2">
          {exhibitions.map((e) => (
            <li key={e.id}>
              <Link href={`/visite/${e.slug}`} className="group grid gap-6 sm:grid-cols-[2fr_3fr]">
                <span className="spotlight flex h-64 items-end justify-center [container-type:inline-size]">
                  {e.cover && <ArtImage artwork={e.cover} size="thumb" alt="" maxHeight="14rem" sizes="(min-width: 768px) 20vw, 90vw" />}
                </span>
                <span className="flex flex-col justify-end gap-2">
                  <span className={`label-caps ${e.is_current ? "text-accent" : "text-ink-muted"}`}>
                    {e.is_current ? th("currentExhibition") : t("archive")}
                  </span>
                  <span className="font-serif text-3xl group-hover:text-accent">{localized(locale, e.title, e.title_en)}</span>
                  <span className="text-sm text-ink-soft">
                    {formatDateRange(e.starts_at, e.ends_at, locale)} · {th("worksCount", { count: e.count })}
                  </span>
                  <span className="line-clamp-3 font-light text-ink-soft">{localized(locale, e.curatorial_text, e.curatorial_text_en)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
