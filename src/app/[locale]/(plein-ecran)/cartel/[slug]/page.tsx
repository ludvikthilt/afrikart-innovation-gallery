import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/layout/logo";
import { PrintButton } from "@/components/ui/print-button";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getArtworkBySlug } from "@/lib/data/artworks";
import { formatPrice, localized } from "@/lib/format";
import { artworkImageUrl } from "@/lib/images";
import { artworkPublicUrl, qrSvg } from "@/lib/qr";
import { isSupabaseConfigured } from "@/lib/supabase/env";

type Props = PageProps<"/[locale]/cartel/[slug]">;

export const metadata: Metadata = { robots: { index: false } };

/**
 * Cartel imprimable (A6, fond clair) à poser à côté de l'œuvre physique.
 * « Imprimer » ouvre la boîte d'impression du navigateur, qui propose aussi
 * « Enregistrer en PDF ».
 */
export default async function CartelPage({ params }: Props) {
  const { locale, slug } = await params;
  if (!isSupabaseConfigured) notFound();
  const [found, t, ta] = await Promise.all([
    getArtworkBySlug(slug),
    getTranslations({ locale: locale as Locale, namespace: "cartel" }),
    getTranslations({ locale: locale as Locale, namespace: "artwork" }),
  ]);
  if (!found) notFound();
  const { artwork } = found;
  const l = locale as Locale;
  const svg = await qrSvg(artworkPublicUrl(artwork.slug));

  return (
    <div data-theme="museum" className="flex flex-1 flex-col items-center gap-8 bg-[#efe6d2] px-4 py-10 print:bg-white print:p-0">
      <style>{`@page { size: A6 portrait; margin: 0; } @media print { body { background: #fff; } }`}</style>

      <div className="flex flex-wrap items-center justify-center gap-3 print:hidden">
        <PrintButton label={t("print")} />
        <a href={`/api/qr/${artwork.slug}?format=png&download=1`} className="btn btn-secondary">
          {t("downloadPng")}
        </a>
        <a href={`/api/qr/${artwork.slug}?format=svg&download=1`} className="btn btn-secondary">
          {t("downloadSvg")}
        </a>
        <Link href={`/oeuvres/${artwork.slug}`} className="btn btn-ghost">
          {t("back")}
        </Link>
      </div>

      {/* A6 = 105 × 148 mm */}
      {/* Sur téléphone, le cartel A6 (≈ 397 px) est réduit pour tenir dans l'écran ; l'impression reste à 100 %. */}
      <article className="flex h-[148mm] w-[105mm] flex-col justify-between bg-canvas p-[9mm] text-ink shadow-xl [zoom:0.88] min-[420px]:[zoom:1] print:[zoom:1] print:shadow-none">
        <div className="flex flex-col gap-[2mm]">
          {/* Vignette de l'œuvre, pour la reconnaître d'un coup d'œil */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={artworkImageUrl(artwork, "medium")}
            alt={artwork.image_alt ?? localized(l, artwork.title, artwork.title_en)}
            className="mb-[3mm] h-[46mm] w-full object-contain object-left"
            style={{ backgroundColor: "transparent" }}
          />
          <h1 className="font-serif text-[20pt] leading-tight italic">{localized(l, artwork.title, artwork.title_en)}</h1>
          <p className="text-[13pt] font-semibold">{artwork.artist.display_name}</p>
          <p className="text-[10pt] leading-snug text-ink-soft">
            {[artwork.year, localized(l, artwork.medium, artwork.medium_en), artwork.dimensions].filter(Boolean).join(" · ")}
          </p>
          {artwork.for_sale && (
            <p className="mt-[2mm] font-label text-[12pt] font-semibold">
              {artwork.price !== null && artwork.sale_status !== "sold" && formatPrice(artwork.price, artwork.currency, l)}
              <span className="ml-[3mm] text-[9pt] font-normal text-ink-soft">{ta(`status.${artwork.sale_status}`)}</span>
            </p>
          )}
        </div>
        <div className="flex items-end justify-between gap-[4mm]">
          <div className="flex flex-col gap-[3mm]">
            <p className="max-w-[48mm] text-[9pt] leading-snug">{t("scan")}</p>
            <Logo onLight className="origin-left scale-75" />
          </div>
          <div className="size-[30mm] shrink-0 [&_svg]:size-full" dangerouslySetInnerHTML={{ __html: svg }} aria-label={t("qrAlt")} role="img" />
        </div>
      </article>
    </div>
  );
}
