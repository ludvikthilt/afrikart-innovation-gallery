/**
 * Identité de la galerie, lue depuis les variables NEXT_PUBLIC_* du fichier .env.
 *
 * Chaque variable est référencée littéralement (process.env.NEXT_PUBLIC_X) :
 * c'est la seule forme que Next.js sait remplacer au build, côté serveur
 * comme côté client. Une valeur absente ou vide retombe sur le défaut.
 */

type Localized = { fr: string; en: string };

const read = (value: string | undefined, fallback: string): string => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
};

const optional = (value: string | undefined): string | null => value?.trim() || null;

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
const color = (value: string | undefined, fallback: string): string => {
  const v = value?.trim();
  return v && HEX.test(v) ? v : fallback;
};

const name = read(process.env.NEXT_PUBLIC_BRAND_NAME, "LE VILLAGE");
const subtitle = read(process.env.NEXT_PUBLIC_BRAND_SUBTITLE, "Art Gallery");

export const brand = {
  name,
  subtitle,
  fullName: read(process.env.NEXT_PUBLIC_BRAND_FULL_NAME, `${name} ${subtitle}`.toUpperCase()),
  tagline: {
    fr: read(process.env.NEXT_PUBLIC_BRAND_TAGLINE_FR, "La galerie phygitale des arts visuels africains"),
    en: read(process.env.NEXT_PUBLIC_BRAND_TAGLINE_EN, "The phygital gallery of African visual arts"),
  } satisfies Localized,
  description: {
    fr: read(
      process.env.NEXT_PUBLIC_BRAND_DESCRIPTION_FR,
      "Visitez des expositions d'art africain contemporain comme dans une vraie galerie.",
    ),
    en: read(
      process.env.NEXT_PUBLIC_BRAND_DESCRIPTION_EN,
      "Walk through contemporary African art exhibitions as in a real gallery.",
    ),
  } satisfies Localized,

  /** Logo complet (image). Vide = symbole + nom en texte. */
  logoUrl: optional(process.env.NEXT_PUBLIC_BRAND_LOGO_URL),
  /** Symbole seul (masque), affiché à côté du nom en texte. */
  markUrl: optional(process.env.NEXT_PUBLIC_BRAND_MARK_URL),
  logoLightUrl: optional(process.env.NEXT_PUBLIC_BRAND_LOGO_LIGHT_URL),
  faviconUrl: read(process.env.NEXT_PUBLIC_BRAND_FAVICON_URL, "/favicon.ico"),
  ogImageUrl: optional(process.env.NEXT_PUBLIC_BRAND_OG_IMAGE_URL),

  colors: {
    accent: color(process.env.NEXT_PUBLIC_BRAND_ACCENT, "#1F4D2A"),
    accentHover: color(process.env.NEXT_PUBLIC_BRAND_ACCENT_HOVER, "#14331A"),
    accent2: color(process.env.NEXT_PUBLIC_BRAND_ACCENT_2, "#C8952F"),
    ink: color(process.env.NEXT_PUBLIC_BRAND_INK, "#17241A"),
    canvasDark: color(process.env.NEXT_PUBLIC_BRAND_CANVAS_DARK, "#10231A"),
    canvasLight: color(process.env.NEXT_PUBLIC_BRAND_CANVAS_LIGHT, "#FBF5E8"),
  },

  contact: {
    email: optional(process.env.NEXT_PUBLIC_BRAND_CONTACT_EMAIL),
    whatsapp: optional(process.env.NEXT_PUBLIC_BRAND_WHATSAPP),
    instagram: optional(process.env.NEXT_PUBLIC_BRAND_INSTAGRAM_URL),
    facebook: optional(process.env.NEXT_PUBLIC_BRAND_FACEBOOK_URL),
    tiktok: optional(process.env.NEXT_PUBLIC_BRAND_TIKTOK_URL),
    city: optional(process.env.NEXT_PUBLIC_BRAND_CITY),
    country: optional(process.env.NEXT_PUBLIC_BRAND_COUNTRY),
  },

  event: {
    fr: optional(process.env.NEXT_PUBLIC_EVENT_LABEL_FR),
    en: optional(process.env.NEXT_PUBLIC_EVENT_LABEL_EN),
  },
} as const;

export const settings = {
  siteUrl: read(process.env.NEXT_PUBLIC_SITE_URL, "http://localhost:3000").replace(/\/$/, ""),
  defaultLocale: process.env.NEXT_PUBLIC_DEFAULT_LOCALE?.trim() === "en" ? "en" : "fr",
  currency: read(process.env.NEXT_PUBLIC_DEFAULT_CURRENCY, "XAF"),
  kioskIdleMinutes: Math.max(1, Number(process.env.NEXT_PUBLIC_KIOSK_IDLE_MINUTES) || 3),
} as const;

/** Variables CSS injectées dans <html> pour que Tailwind suive les couleurs du .env. */
export const brandCssVariables = `:root{--brand-accent:${brand.colors.accent};--brand-accent-hover:${brand.colors.accentHover};--brand-accent-2:${brand.colors.accent2};--brand-ink:${brand.colors.ink};--brand-canvas-dark:${brand.colors.canvasDark};--brand-canvas-light:${brand.colors.canvasLight};}`;
