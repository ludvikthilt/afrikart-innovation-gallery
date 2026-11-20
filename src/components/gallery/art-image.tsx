import Image from "next/image";
import { artworkImageUrl } from "@/lib/images";

export type FramedArtwork = {
  image_path: string;
  image_medium_path: string | null;
  image_thumb_path: string | null;
  image_width: number;
  image_height: number;
  image_alt: string | null;
  dominant_color: string | null;
  title: string;
};

type Props = {
  artwork: FramedArtwork;
  /** Hauteur maximale du cadre (CSS). La largeur suit le ratio et la colonne (cqw). */
  maxHeight: string;
  size?: "thumb" | "medium";
  sizes: string;
  priority?: boolean;
  alt?: string;
  className?: string;
};

/**
 * Cadre au ratio réel de l'œuvre (jamais déformée), couleur dominante
 * pendant le chargement : jamais de cadre vide. Le parent doit déclarer
 * `container-type: inline-size` pour que le cadre tienne dans sa colonne.
 */
export function ArtImage({ artwork, maxHeight, size = "medium", sizes, priority, alt, className = "" }: Props) {
  const ratio = artwork.image_width / artwork.image_height;
  return (
    <span
      className={`relative block shadow-frame ${className}`}
      style={{
        aspectRatio: `${artwork.image_width} / ${artwork.image_height}`,
        height: `min(${maxHeight}, calc(100cqw / ${ratio.toFixed(4)}))`,
        backgroundColor: artwork.dominant_color ?? "#222",
      }}
    >
      <Image
        src={artworkImageUrl(artwork, size)}
        alt={alt ?? artwork.image_alt ?? artwork.title}
        fill
        sizes={sizes}
        priority={priority}
        className="object-cover"
      />
    </span>
  );
}
