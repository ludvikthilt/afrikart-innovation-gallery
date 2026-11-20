"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { redirect } from "@/i18n/navigation";
import { processUploadedArtwork, type ProcessedImage } from "@/lib/image-pipeline";
import { slugify, uniqueSlug } from "@/lib/slug";
import { createClient } from "@/lib/supabase/server";

/** Revérifie dans chaque action que l'appelant est artiste (ou admin). */
async function artistContext() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return null;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).single();
  if (profile?.role !== "artist" && profile?.role !== "admin") return null;
  return { supabase, userId };
}

const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null);
const intOrNull = (min: number, max: number) =>
  z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : Number(v)))
    .pipe(z.number().int().min(min).max(max).nullable());
const checkbox = z.preprocess((v) => v === "on" || v === "true", z.boolean());

// ------------------------------------------------------------------ images
export async function prepareArtworkImage(originalPath: string): Promise<ProcessedImage | { error: string }> {
  const ctx = await artistContext();
  if (!ctx) return { error: "auth" };
  try {
    return await processUploadedArtwork(ctx.supabase, ctx.userId, originalPath);
  } catch (error) {
    console.error("pipeline image", error);
    return { error: "image" };
  }
}

// ------------------------------------------------------------------ œuvres
const imageSchema = z.object({
  image_path: z.string().min(1),
  image_medium_path: z.string().min(1),
  image_thumb_path: z.string().min(1),
  image_width: z.number().int().positive(),
  image_height: z.number().int().positive(),
  dominant_color: z.string().regex(/^#[0-9a-f]{6}$/i),
  blurhash: z.string().max(100),
});

const artworkSchema = z
  .object({
    id: z.uuid().optional().or(z.literal("").transform(() => undefined)),
    title: z.string().trim().min(1).max(160),
    title_en: text(160),
    description: text(5000),
    description_en: text(5000),
    year: intOrNull(1000, 2100),
    medium: text(160),
    medium_en: text(160),
    dimensions: text(80),
    image_alt: text(300),
    collection_id: z.uuid().nullable().or(z.literal("").transform(() => null)),
    for_sale: checkbox,
    price: z
      .string()
      .trim()
      .transform((v) => (v === "" ? null : Number(v.replace(/[\s ]/g, ""))))
      .pipe(z.number().min(0).max(1e12).nullable()),
    sale_status: z.enum(["available", "reserved", "sold"]).optional(),
    is_published: checkbox,
    image: z
      .string()
      .transform((v) => (v ? JSON.parse(v) : null))
      .pipe(imageSchema.nullable()),
  })
  .refine((v) => !v.for_sale || v.price !== null, { path: ["price"], message: "priceRequired" })
  .refine((v) => v.id || v.image, { path: ["image"], message: "imageRequired" });

export type ArtworkFormState = { error?: "invalid" | "generic" | "auth"; fieldErrors?: Record<string, string> };

export async function saveArtwork(_prev: ArtworkFormState, formData: FormData): Promise<ArtworkFormState> {
  const ctx = await artistContext();
  if (!ctx) return { error: "auth" };
  let parsed;
  try {
    parsed = artworkSchema.safeParse(Object.fromEntries(formData));
  } catch {
    return { error: "invalid" };
  }
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { error: "invalid", fieldErrors };
  }
  const { id, image, for_sale, sale_status, price, ...fields } = parsed.data;
  const { supabase, userId } = ctx;

  const row = {
    ...fields,
    for_sale,
    price: for_sale ? price : null,
    sale_status: for_sale ? (sale_status ?? "available") : ("not_for_sale" as const),
    ...(image ?? {}),
  };

  if (id) {
    const { error } = await supabase.from("artworks").update(row).eq("id", id);
    if (error) return { error: "generic" };
  } else {
    const base = slugify(fields.title);
    const { data: taken } = await supabase.from("artworks").select("slug").like("slug", `${base}%`);
    const slug = uniqueSlug(base, (taken ?? []).map((t) => t.slug));
    const { error } = await supabase.from("artworks").insert({ ...row, ...image!, slug, artist_id: userId });
    if (error) {
      console.error("insert artwork", error);
      return { error: "generic" };
    }
  }

  revalidatePath("/", "layout");
  redirect({ href: "/studio/oeuvres", locale: await getLocale() });
  return {};
}

export async function deleteArtwork(formData: FormData): Promise<void> {
  const ctx = await artistContext();
  const id = z.uuid().safeParse(formData.get("id"));
  if (!ctx || !id.success) return;
  const { data: artwork } = await ctx.supabase.from("artworks").select("image_path").eq("id", id.data).maybeSingle();
  const { error } = await ctx.supabase.from("artworks").delete().eq("id", id.data);
  if (!error && artwork && !artwork.image_path.startsWith("http")) {
    const folder = artwork.image_path.split("/").slice(0, -1).join("/");
    await ctx.supabase.storage
      .from("artworks")
      .remove(["full.webp", "medium.webp", "thumb.webp"].map((f) => `${folder}/${f}`));
  }
  revalidatePath("/", "layout");
  redirect({ href: "/studio/oeuvres", locale: await getLocale() });
}

// -------------------------------------------------------------- collections
const collectionSchema = z.object({
  id: z.uuid().optional().or(z.literal("").transform(() => undefined)),
  title: z.string().trim().min(1).max(160),
  description: text(5000),
  description_en: text(5000),
  year: intOrNull(1900, 2100),
  is_published: checkbox,
  cover_artwork_id: z.uuid().nullable().or(z.literal("").transform(() => null)),
});

export type CollectionFormState = { ok?: boolean; error?: "invalid" | "generic" | "auth" };

export async function saveCollection(_prev: CollectionFormState, formData: FormData): Promise<CollectionFormState> {
  const ctx = await artistContext();
  if (!ctx) return { error: "auth" };
  const parsed = collectionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "invalid" };
  const { id, ...fields } = parsed.data;

  if (id) {
    const { error } = await ctx.supabase.from("collections").update(fields).eq("id", id);
    if (error) return { error: "generic" };
  } else {
    const base = slugify(fields.title);
    const { data: taken } = await ctx.supabase.from("collections").select("slug").like("slug", `${base}%`);
    const { error } = await ctx.supabase
      .from("collections")
      .insert({ ...fields, artist_id: ctx.userId, slug: uniqueSlug(base, (taken ?? []).map((t) => t.slug)) });
    if (error) return { error: "generic" };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteCollection(formData: FormData): Promise<void> {
  const ctx = await artistContext();
  const id = z.uuid().safeParse(formData.get("id"));
  if (!ctx || !id.success) return;
  await ctx.supabase.from("collections").delete().eq("id", id.data);
  revalidatePath("/", "layout");
}

// ------------------------------------------------------------- propositions
export async function toggleProposal(formData: FormData): Promise<void> {
  const ctx = await artistContext();
  const exhibitionId = z.uuid().safeParse(formData.get("exhibitionId"));
  const artworkId = z.uuid().safeParse(formData.get("artworkId"));
  if (!ctx || !exhibitionId.success || !artworkId.success) return;

  if (formData.get("action") === "withdraw") {
    await ctx.supabase
      .from("exhibition_artworks")
      .delete()
      .eq("exhibition_id", exhibitionId.data)
      .eq("artwork_id", artworkId.data)
      .eq("status", "proposed");
  } else {
    await ctx.supabase
      .from("exhibition_artworks")
      .insert({ exhibition_id: exhibitionId.data, artwork_id: artworkId.data, proposed_by: ctx.userId });
  }
  revalidatePath("/studio/propositions");
}
