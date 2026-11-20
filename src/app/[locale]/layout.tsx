import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { brand, brandCssVariables, settings } from "@/config/brand";
import { routing } from "@/i18n/routing";
import { PageZoomLock } from "@/components/layout/page-zoom-lock";
import { bodoni, cinzel, grotesk, jakarta } from "../fonts";
import "../globals.css";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};

  return {
    metadataBase: new URL(settings.siteUrl),
    title: { default: brand.fullName, template: `%s · ${brand.name}` },
    description: brand.description[locale],
    applicationName: brand.fullName,
    icons: { icon: brand.faviconUrl },
    alternates: {
      languages: Object.fromEntries(
        routing.locales.map((l) => [l, l === routing.defaultLocale ? "/" : `/${l}`]),
      ),
    },
    openGraph: {
      siteName: brand.fullName,
      title: brand.fullName,
      description: brand.description[locale],
      locale: locale === "fr" ? "fr_FR" : "en_GB",
      type: "website",
      ...(brand.ogImageUrl ? { images: [brand.ogImageUrl] } : {}),
    },
  };
}

// Pas de zoom de la page : seul le visualiseur d'œuvre zoome (voir PageZoomLock).
export const viewport: Viewport = {
  themeColor: brand.colors.canvasLight,
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "common" });

  return (
    <html lang={locale} className={`${bodoni.variable} ${jakarta.variable} ${grotesk.variable} ${cinzel.variable} h-full antialiased`}>
      <head>
        <style dangerouslySetInnerHTML={{ __html: brandCssVariables }} />
      </head>
      <body className="flex min-h-full flex-col">
        <NextIntlClientProvider>
          <PageZoomLock />
          <a
            href="#contenu"
            className="label-caps sr-only z-[100] bg-accent px-4 py-3 text-white focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
          >
            {t("skipToContent")}
          </a>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
