import type { Locale } from "@/i18n/routing";

/** Champ traduit : la version anglaise si elle existe, sinon le texte d'origine. */
export function localized(locale: Locale, fr: string, en: string | null | undefined): string;
export function localized(locale: Locale, fr: string | null, en: string | null | undefined): string | null;
export function localized(locale: Locale, fr: string | null, en: string | null | undefined) {
  return locale === "en" && en?.trim() ? en : fr;
}

/** 450000 → « 450 000 FCFA » (fr) / « FCFA 450,000 » (en). */
export function formatPrice(amount: number, currency: string, locale: Locale): string {
  return new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Plage de dates d'exposition : « 23 – 27 novembre 2026 ». */
export function formatDateRange(start: string, end: string, locale: Locale): string {
  const fmt = new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return fmt.formatRange(new Date(start), new Date(end));
}
