import { getTranslations } from "next-intl/server";
import { Footer } from "@/components/layout/footer";
import { ArtImage } from "@/components/gallery/art-image";
import { Cartel } from "@/components/gallery/cartel";
import { ArrowRightIcon, CalendarIcon } from "@/components/ui/icons";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getHallData } from "@/lib/data/exhibitions";
import { formatDateRange, localized } from "@/lib/format";
import { isSupabaseConfigured } from "@/lib/supabase/env";

/** Hall d'entrée : l'exposition en cours, sa vitrine, et la porte vers la visite. */
export default async function HallPage({ params }: PageProps<"/[locale]">) {
  const locale = (await params).locale as Locale;
  const [t, tc, hall] = await Promise.all([
    getTranslations({ locale, namespace: "hall" }),
    getTranslations({ locale, namespace: "common" }),
    getHallData(4),
  ]);

  if (!hall) {
    return (
      <>
        <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-6 px-4 py-24 text-center">
          <p className="label-caps text-accent">{t("currentExhibition")}</p>
          <h1 className="font-serif text-4xl text-balance sm:text-5xl">{t("emptyTitle")}</h1>
          <p className="max-w-xl text-lg font-light text-ink-soft">{t("emptyText")}</p>
          {!isSupabaseConfigured && (
            <p role="status" className="hairline-frame rounded-sm px-4 py-3 text-sm text-ink-soft">
              {tc("supabaseMissing")}
            </p>
          )}
        </section>
        <Footer />
      </>
    );
  }

  const { exhibition, featured } = hall;
  const title = localized(locale, exhibition.title, exhibition.title_en);
  const curatorial = localized(locale, exhibition.curatorial_text, exhibition.curatorial_text_en);

  return (
    <div data-theme={exhibition.room_theme} className="relative flex flex-1 flex-col bg-canvas text-ink">
      <section className="hall-scene relative isolate flex flex-1 flex-col overflow-hidden">
        {/* Architecture de la galerie : plafond à lattes lumineuses, sol clair */}
        <div aria-hidden="true" className="hall-ceiling absolute inset-x-0 top-0 h-24 sm:h-32" />
        <div aria-hidden="true" className="hall-floor absolute inset-x-0 bottom-0 h-[34%]" />

        <div className="relative mx-auto grid w-full max-w-[1600px] flex-1 gap-8 px-4 pt-28 pb-8 sm:px-8 sm:pt-36 lg:grid-cols-[minmax(320px,26rem)_1fr] lg:items-end lg:gap-14 lg:px-12 lg:pb-14">
          {/* La borne tactile de l'entrée */}
          <div className="flex flex-col items-center lg:items-stretch">
            <div className="w-full overflow-hidden rounded-xl bg-[#14331a] text-[#fbf5e8] shadow-2xl ring-8 ring-[#e6dbc2]">
              <div aria-hidden="true" className="village-band" />
              <div className="p-6 sm:p-8">
              <p className="label-caps flex items-center gap-2 text-accent-2">
                <span className="size-1.5 rounded-full bg-accent-2" aria-hidden="true" />
                {t("currentExhibition")}
              </p>
              <h1 className="mt-3 font-display text-4xl leading-tight font-bold sm:text-5xl">{title}</h1>
              <p className="label-caps mt-4 flex items-center gap-2 text-white/80">
                <CalendarIcon size={14} />
                {formatDateRange(exhibition.starts_at, exhibition.ends_at, locale)}
              </p>
              {curatorial && <p className="mt-4 line-clamp-4 text-[0.9375rem] leading-relaxed text-white/80">{curatorial}</p>}
              <p className="label-caps mt-4 text-white/60">
                {t("roomsCount", { count: hall.roomsCount })} · {t("worksCount", { count: hall.artworksCount })}
              </p>
              <Link href={`/visite/${exhibition.slug}`} className="btn mt-6 min-h-12 w-full bg-accent-2 text-sm text-[#14331a] hover:bg-[#d9a945]">
                {t("enter")}
                <ArrowRightIcon size={16} />
              </Link>
              <p className="mt-3 hidden text-center text-xs text-white/60 sm:block">{t("hint")}</p>
              </div>
            </div>
            {/* Pied de la borne */}
            <div aria-hidden="true" className="hidden h-24 w-24 bg-gradient-to-b from-[#cbbd9f] to-[#e8dcc2] [clip-path:polygon(18%_0,82%_0,100%_100%,0_100%)] lg:block lg:self-center" />
          </div>

          {/* Cimaises : panneaux blancs posés au sol, une œuvre par panneau, en profondeur */}
          <ul
            aria-label={t("featuredLabel")}
            className="-mx-4 flex snap-x snap-mandatory items-end gap-5 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:px-0 lg:gap-8 lg:overflow-visible"
          >
            {featured.map((artwork, index) => (
              <li
                key={artwork.id}
                className="w-[72vw] shrink-0 snap-center sm:w-[44vw] lg:w-auto lg:flex-1"
                style={{ ["--depth" as string]: index % 2 ? "0.9" : "1" }}
              >
                <Link href={`/oeuvres/${artwork.slug}`} className="group block">
                  <div className="cimaise flex flex-col items-center gap-4 px-4 pt-8 pb-5 lg:origin-bottom lg:scale-[var(--depth)]">
                    <div className="flex w-full justify-center [container-type:inline-size]">
                      <ArtImage
                        artwork={artwork}
                        alt={artwork.image_alt ?? localized(locale, artwork.title, artwork.title_en)}
                        maxHeight="min(36svh, 340px)"
                        sizes="(min-width: 1024px) 20vw, 70vw"
                        priority={index < 2}
                        className="transition-transform duration-500 group-hover:-translate-y-1"
                      />
                    </div>
                    <div className="w-full">
                      <Cartel artwork={artwork} />
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <Footer />
    </div>
  );
}
