import { defineRouting } from "next-intl/routing";
import { settings } from "@/config/brand";

export const locales = ["fr", "en"] as const;
export type Locale = (typeof locales)[number];

export const routing = defineRouting({
  locales,
  defaultLocale: settings.defaultLocale,
  // La langue par défaut n'a pas de préfixe : /oeuvres/x (QR codes stables),
  // l'autre langue est préfixée : /en/oeuvres/x.
  localePrefix: "as-needed",
});

export const isLocale = (value: unknown): value is Locale =>
  typeof value === "string" && (locales as readonly string[]).includes(value);
