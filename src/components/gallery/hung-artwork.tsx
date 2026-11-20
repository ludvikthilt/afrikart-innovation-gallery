import { useLocale } from "next-intl";
import type { Locale } from "@/i18n/routing";
import { localized } from "@/lib/format";
import { ArtImage, type FramedArtwork } from "./art-image";
import { Cartel, type CartelArtwork } from "./cartel";

type Props = {
  artwork: FramedArtwork & CartelArtwork;
  /** Hauteur maximale du cadre (unité CSS), la largeur suit le ratio réel. */
  maxHeight: string;
  sizes: string;
  priority?: boolean;
};

/** Œuvre accrochée au mur : halo de projecteur, cadre au ratio réel, cartel dessous. */
export function HungArtwork({ artwork, maxHeight, sizes, priority = false }: Props) {
  const locale = useLocale() as Locale;
  return (
    <figure className="flex w-full flex-col items-center gap-5 [container-type:inline-size]">
      <div className="spotlight flex w-full justify-center px-2 pt-8 pb-2">
        <ArtImage
          artwork={artwork}
          alt={artwork.image_alt ?? localized(locale, artwork.title, artwork.title_en)}
          maxHeight={maxHeight}
          sizes={sizes}
          priority={priority}
        />
      </div>
      <figcaption className="w-full max-w-xs px-2">
        <Cartel artwork={artwork} />
      </figcaption>
    </figure>
  );
}
