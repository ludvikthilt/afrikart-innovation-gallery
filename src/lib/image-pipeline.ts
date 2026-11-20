import "server-only";
import { encode } from "blurhash";
import sharp from "sharp";
import type { SupabaseClient } from "@supabase/supabase-js";
import { publicImageUrl } from "@/lib/images";
import type { Database } from "@/types/database";

export type ProcessedImage = {
  image_path: string;
  image_medium_path: string;
  image_thumb_path: string;
  image_width: number;
  image_height: number;
  dominant_color: string;
  blurhash: string;
};

const VARIANTS = [
  { key: "image_path", name: "full", size: 3200, quality: 86 },
  { key: "image_medium_path", name: "medium", size: 1600, quality: 82 },
  { key: "image_thumb_path", name: "thumb", size: 400, quality: 78 },
] as const;

const hex = (n: number) => Math.round(n).toString(16).padStart(2, "0");

/**
 * Transforme l'original déposé par l'artiste ({uid}/{dossier}/original.ext)
 * en 3 variantes WebP (pleine, moyenne, miniature) + dimensions, couleur
 * dominante et blurhash. L'original est ensuite supprimé.
 */
export async function processUploadedArtwork(
  supabase: SupabaseClient<Database>,
  userId: string,
  originalPath: string,
): Promise<ProcessedImage> {
  if (!originalPath.startsWith(`${userId}/`) || originalPath.includes("..")) throw new Error("chemin invalide");

  const url = publicImageUrl(originalPath, "artworks");
  const res = await fetch(url!, { cache: "no-store" });
  if (!res.ok) throw new Error(`original introuvable (${res.status})`);
  const input = Buffer.from(await res.arrayBuffer());

  const base = sharp(input, { failOn: "error", limitInputPixels: 120_000_000 }).rotate();
  const meta = await base.metadata();
  const oriented = (meta.orientation ?? 1) >= 5;
  const width = (oriented ? meta.height : meta.width) ?? 0;
  const height = (oriented ? meta.width : meta.height) ?? 0;
  if (!width || !height) throw new Error("image illisible");

  const folder = originalPath.split("/").slice(0, -1).join("/");
  const out: Partial<ProcessedImage> = { image_width: width, image_height: height };

  for (const v of VARIANTS) {
    const buffer = await base
      .clone()
      .resize({ width: v.size, height: v.size, fit: "inside", withoutEnlargement: true })
      .webp({ quality: v.quality })
      .toBuffer();
    const path = `${folder}/${v.name}.webp`;
    const { error } = await supabase.storage.from("artworks").upload(path, buffer, {
      contentType: "image/webp",
      upsert: true,
      cacheControl: "31536000",
    });
    if (error) throw error;
    out[v.key] = path;
  }

  const { dominant } = await base.clone().resize(64, 64, { fit: "inside" }).stats();
  out.dominant_color = `#${hex(dominant.r)}${hex(dominant.g)}${hex(dominant.b)}`;

  const { data: pixels, info } = await base
    .clone()
    .resize(32, 32, { fit: "inside" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  out.blurhash = encode(new Uint8ClampedArray(pixels), info.width, info.height, 4, 3);

  await supabase.storage.from("artworks").remove([originalPath]);
  return out as ProcessedImage;
}

/** Avatar carré 256 px en WebP. */
export async function processAvatar(supabase: SupabaseClient<Database>, userId: string, originalPath: string): Promise<string> {
  if (!originalPath.startsWith(`${userId}/`) || originalPath.includes("..")) throw new Error("chemin invalide");
  const res = await fetch(publicImageUrl(originalPath, "avatars")!, { cache: "no-store" });
  if (!res.ok) throw new Error("avatar introuvable");
  const buffer = await sharp(Buffer.from(await res.arrayBuffer()))
    .rotate()
    .resize(256, 256, { fit: "cover" })
    .webp({ quality: 82 })
    .toBuffer();
  const path = `${userId}/avatar-${Date.now()}.webp`;
  const { error } = await supabase.storage.from("avatars").upload(path, buffer, { contentType: "image/webp", upsert: true });
  if (error) throw error;
  await supabase.storage.from("avatars").remove([originalPath]);
  return path;
}
