import { supabaseUrl } from "@/lib/supabase/env";

type Bucket = "artworks" | "avatars" | "exhibitions";

/** URL publique d'un fichier Storage. Les URL absolues (seed) sont renvoyées telles quelles. */
export function publicImageUrl(path: string | null | undefined, bucket: Bucket = "artworks"): string | null {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
}

type ArtworkImage = {
  image_path: string;
  image_medium_path: string | null;
  image_thumb_path: string | null;
};

/** Variante adaptée à l'usage : miniature, moyenne (affichage au mur) ou pleine (zoom). */
export function artworkImageUrl(artwork: ArtworkImage, size: "thumb" | "medium" | "full"): string {
  const path =
    size === "thumb"
      ? (artwork.image_thumb_path ?? artwork.image_medium_path ?? artwork.image_path)
      : size === "medium"
        ? (artwork.image_medium_path ?? artwork.image_path)
        : artwork.image_path;
  return publicImageUrl(path) ?? "";
}
