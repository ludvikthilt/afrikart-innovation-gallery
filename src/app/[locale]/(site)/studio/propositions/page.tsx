import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { toggleProposal } from "@/actions/studio";
import type { Locale } from "@/i18n/routing";
import { requireRole } from "@/lib/auth";
import { getMyArtworks } from "@/lib/data/studio";
import { formatDateRange, localized } from "@/lib/format";
import { artworkImageUrl } from "@/lib/images";
import { createClient } from "@/lib/supabase/server";

/** Proposer ses œuvres publiées aux expositions en cours ou à venir. */
export default async function StudioProposals() {
  const me = await requireRole(["artist", "admin"], "/studio/propositions");
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const [t, locale, artworks, { data: exhibitions }] = await Promise.all([
    getTranslations("studio"),
    getLocale() as Promise<Locale>,
    getMyArtworks(me.id),
    supabase
      .from("exhibitions")
      .select("id, title, title_en, starts_at, ends_at")
      .eq("is_published", true)
      .gte("ends_at", today)
      .order("starts_at"),
  ]);
  const published = artworks.filter((a) => a.is_published);

  return (
    <div className="flex flex-col gap-10">
      <header>
        <h1 className="font-serif text-4xl">{t("nav.proposals")}</h1>
        <p className="mt-2 text-ink-soft">{t("proposalsIntro")}</p>
      </header>
      {(exhibitions ?? []).length === 0 && <p className="text-ink-soft">{t("noOpenExhibition")}</p>}
      {published.length === 0 && <p className="text-ink-soft">{t("publishFirst")}</p>}
      {(exhibitions ?? []).map((e) => (
        <section key={e.id} className="flex flex-col gap-4">
          <h2 className="font-serif text-2xl">
            {localized(locale, e.title, e.title_en)}{" "}
            <span className="font-sans text-sm text-ink-muted">· {formatDateRange(e.starts_at, e.ends_at, locale)}</span>
          </h2>
          <ul className="flex flex-col divide-y divide-hairline-soft border-y border-hairline-soft">
            {published.map((a) => {
              const placement = a.placements.find((p) => p.exhibition_id === e.id);
              return (
                <li key={a.id} className="flex items-center gap-4 py-3">
                  <span className="relative size-14 shrink-0 overflow-hidden" style={{ backgroundColor: a.dominant_color ?? "#222" }}>
                    <Image src={artworkImageUrl(a, "thumb")} alt="" fill sizes="56px" className="object-cover" />
                  </span>
                  <span className="flex-1 font-serif italic">{a.title}</span>
                  <form action={toggleProposal} className="flex items-center gap-3">
                    <input type="hidden" name="exhibitionId" value={e.id} />
                    <input type="hidden" name="artworkId" value={a.id} />
                    {placement ? (
                      <>
                        <span className="label-caps text-ink-soft">{t(`placement.${placement.status}`)}</span>
                        {placement.status === "proposed" && (
                          <button type="submit" name="action" value="withdraw" className="text-sm text-ink-muted hover:text-danger">
                            {t("withdraw")}
                          </button>
                        )}
                      </>
                    ) : (
                      <button type="submit" name="action" value="propose" className="btn btn-secondary min-h-9 px-4">
                        {t("propose")}
                      </button>
                    )}
                  </form>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
