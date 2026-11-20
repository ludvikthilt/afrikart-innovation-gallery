import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import { formatPrice, localized } from "@/lib/format";
import type { SaleStatus } from "@/types/database";

export type CartelArtwork = {
  title: string;
  title_en: string | null;
  year: number | null;
  medium: string | null;
  medium_en: string | null;
  for_sale: boolean;
  price: number | null;
  currency: string;
  sale_status: SaleStatus;
  artist: { display_name: string } | null;
};

export const STATUS_DOT: Record<SaleStatus, string> = {
  available: "bg-status-available",
  reserved: "bg-status-reserved",
  sold: "bg-status-sold",
  not_for_sale: "bg-ink-muted",
};

/** Cartel de musée : titre en italique, artiste, année · technique, prix si à vendre. */
export function Cartel({ artwork, size = "md" }: { artwork: CartelArtwork; size?: "md" | "lg" }) {
  const t = useTranslations("artwork");
  const locale = useLocale() as Locale;
  const meta = [artwork.year, localized(locale, artwork.medium, artwork.medium_en)].filter(Boolean).join(" · ");

  return (
    <div className="flex flex-col gap-0.5 text-left">
      <p className={size === "lg" ? "font-serif text-3xl italic text-ink" : "cartel-title text-ink"}>
        {localized(locale, artwork.title, artwork.title_en)}
      </p>
      {artwork.artist && (
        <p className={`${size === "lg" ? "text-xl" : "text-[0.9375rem]"} font-semibold text-ink`}>
          {artwork.artist.display_name}
        </p>
      )}
      {meta && <p className={`${size === "lg" ? "text-base" : "text-[0.8125rem]"} text-ink-soft`}>{meta}</p>}
      {artwork.for_sale && (
        <p className="mt-1 flex items-center justify-between gap-3">
          {artwork.price !== null && artwork.sale_status !== "sold" ? (
            <span className={`font-label ${size === "lg" ? "text-xl" : "text-[0.9375rem]"} font-semibold tracking-wide text-accent`}>
              {formatPrice(artwork.price, artwork.currency, locale)}
            </span>
          ) : (
            <span />
          )}
          <span className="flex items-center gap-1.5 font-label text-xs tracking-wide text-ink-soft">
            <span className={`size-1.5 rounded-full ${STATUS_DOT[artwork.sale_status]}`} aria-hidden="true" />
            {t(`status.${artwork.sale_status}`)}
          </span>
        </p>
      )}
    </div>
  );
}
