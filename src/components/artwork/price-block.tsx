import { useLocale, useTranslations } from "next-intl";
import { STATUS_DOT } from "@/components/gallery/cartel";
import type { Locale } from "@/i18n/routing";
import { formatPrice } from "@/lib/format";
import type { Rates } from "@/lib/visit/types";
import type { SaleStatus } from "@/types/database";

type Props = { price: number | null; currency: string; status: SaleStatus; rates: Rates | null };

/** Prix en FCFA, badge de statut, conversion indicative EUR / USD avec source datée. */
export function PriceBlock({ price, currency, status, rates }: Props) {
  const t = useTranslations("artwork");
  const locale = useLocale() as Locale;
  const showPrice = price !== null && status !== "sold";
  const approx =
    showPrice && rates && currency === "XAF"
      ? [formatPrice(price * rates.eur, "EUR", locale), formatPrice(price * rates.usd, "USD", locale)].join(" · ")
      : null;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-3">
        {showPrice && (
          <span className="font-label text-2xl font-semibold tracking-wide text-accent">{formatPrice(price, currency, locale)}</span>
        )}
        <span className="label-caps flex items-center gap-1.5 rounded-xs border border-hairline-soft px-2 py-1 text-ink">
          <span className={`size-1.5 rounded-full ${STATUS_DOT[status]}`} aria-hidden="true" />
          {t(`status.${status}`)}
        </span>
      </div>
      {approx && rates && (
        <p className="text-sm text-ink-muted" title={t("ratesSource", { source: rates.source, date: rates.date })}>
          {t("approx", { amounts: approx })}
          <span className="sr-only"> — {t("ratesSource", { source: rates.source, date: rates.date })}</span>
        </p>
      )}
    </div>
  );
}
