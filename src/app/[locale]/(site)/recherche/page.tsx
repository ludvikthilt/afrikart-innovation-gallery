import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { SearchIcon } from "@/components/ui/icons";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { searchGallery } from "@/lib/data/search";
import { publicImageUrl } from "@/lib/images";
import { groupResults, searchResultHref } from "@/lib/search";

type Props = PageProps<"/[locale]/recherche">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale as Locale, namespace: "search" });
  return { title: t("label") };
}

/** Recherche en page entière (lien partageable, fonctionne sans JavaScript). */
export default async function SearchPage({ searchParams }: Props) {
  const query = (await searchParams).q;
  const q = (Array.isArray(query) ? query[0] : query)?.trim() ?? "";
  const [t, results] = await Promise.all([getTranslations("search"), searchGallery(q, 12)]);
  const groups = groupResults(results);
  const sections = [
    { key: "artist", label: t("artists"), items: groups.artist },
    { key: "artwork", label: t("artworks"), items: groups.artwork },
    { key: "collection", label: t("collections"), items: groups.collection },
  ];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-12 sm:px-8">
      <h1 className="font-serif text-4xl">{t("label")}</h1>
      <form role="search" className="flex gap-2">
        <label htmlFor="q" className="sr-only">
          {t("placeholder")}
        </label>
        <input id="q" name="q" type="search" defaultValue={q} placeholder={t("placeholder")} className="field-input flex-1" />
        <button type="submit" className="btn btn-primary" aria-label={t("label")}>
          <SearchIcon size={16} />
        </button>
      </form>

      {q.length >= 2 && results.length === 0 && <p className="text-ink-soft">{t("empty")}</p>}

      {sections.map(
        (s) =>
          s.items.length > 0 && (
            <section key={s.key} className="flex flex-col gap-2">
              <h2 className="label-caps text-ink-muted">{s.label}</h2>
              <ul className="flex flex-col divide-y divide-hairline-soft">
                {s.items.map((r) => {
                  const image = publicImageUrl(r.image_path, r.kind === "artist" ? "avatars" : "artworks");
                  return (
                    <li key={r.id}>
                      <Link href={searchResultHref(r)} className="flex items-center gap-4 py-3 hover:text-accent">
                        <span className="relative size-12 shrink-0 overflow-hidden bg-surface-raised">
                          {image && <Image src={image} alt="" fill sizes="48px" className="object-cover" />}
                        </span>
                        <span className="flex min-w-0 flex-col">
                          <span className={r.kind === "artwork" ? "font-serif text-lg italic" : "text-lg"}>{r.title}</span>
                          {r.subtitle && <span className="text-sm text-ink-muted">{r.subtitle}</span>}
                        </span>
                        {r.room_position !== null && (
                          <span className="label-caps ml-auto text-accent">{t("inRoom", { room: r.room_position })}</span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ),
      )}
    </div>
  );
}
