import { getLocale, getTranslations } from "next-intl/server";
import { ExhibitionForm } from "@/components/admin/exhibition-form";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { formatDateRange, localized } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export default async function AdminExhibitions() {
  const supabase = await createClient();
  const [t, locale, { data }] = await Promise.all([
    getTranslations("admin"),
    getLocale() as Promise<Locale>,
    supabase
      .from("exhibitions")
      .select("id, title, title_en, starts_at, ends_at, is_current, is_published, exhibition_artworks(status)")
      .order("starts_at", { ascending: false }),
  ]);

  return (
    <div className="flex flex-col gap-10">
      <h1 className="font-serif text-4xl">{t("nav.exhibitions")}</h1>
      <ul className="flex flex-col divide-y divide-hairline-soft border-y border-hairline-soft">
        {(data ?? []).map((e) => {
          const placements = (e.exhibition_artworks ?? []) as { status: string }[];
          const proposed = placements.filter((p) => p.status === "proposed").length;
          return (
            <li key={e.id}>
              <Link href={`/admin/expositions/${e.id}`} className="flex flex-wrap items-center gap-4 py-4 hover:text-accent">
                <span className="font-serif text-xl">{localized(locale, e.title, e.title_en)}</span>
                <span className="text-sm text-ink-muted">{formatDateRange(e.starts_at, e.ends_at, locale)}</span>
                <span className="ml-auto flex gap-2">
                  {e.is_current && <span className="label-caps rounded-xs border border-accent/50 px-2 py-1 text-accent">{t("current")}</span>}
                  {!e.is_published && <span className="label-caps rounded-xs border border-hairline-soft px-2 py-1 text-ink-muted">{t("draft")}</span>}
                  {proposed > 0 && (
                    <span className="label-caps rounded-xs border border-status-reserved/50 px-2 py-1 text-status-reserved">
                      {t("proposedCount", { count: proposed })}
                    </span>
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      <section className="flex flex-col gap-5 rounded-sm border border-dashed border-hairline p-5">
        <h2 className="label-caps text-ink-soft">{t("newExhibition")}</h2>
        <ExhibitionForm />
      </section>
    </div>
  );
}
