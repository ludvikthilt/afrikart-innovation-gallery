"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { redirect } from "@/i18n/navigation";
import { slugify, uniqueSlug } from "@/lib/slug";
import { createClient } from "@/lib/supabase/server";

/** Revérifie dans chaque action que l'appelant est admin (la RLS le refait en base). */
async function adminContext() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return null;
  const { data } = await supabase.from("profiles").select("role").eq("id", userId).single();
  return data?.role === "admin" ? { supabase, userId } : null;
}

const uuid = z.uuid();
const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null);
const checkbox = z.preprocess((v) => v === "on" || v === "true", z.boolean());

const done = () => revalidatePath("/", "layout");

// ------------------------------------------------------ demandes d'artiste
export async function reviewRequest(formData: FormData): Promise<void> {
  const ctx = await adminContext();
  const id = uuid.safeParse(formData.get("id"));
  if (!ctx || !id.success) return;
  const note = String(formData.get("note") ?? "").trim() || undefined;
  await ctx.supabase.rpc("review_artist_request", { request_id: id.data, approve: formData.get("decision") === "approve", note });
  done();
}

// ------------------------------------------------------------- expositions
const exhibitionSchema = z
  .object({
    id: z.preprocess((v) => (v === undefined || v === null || v === "" ? undefined : v), uuid.optional()),
    title: z.string().trim().min(1).max(160),
    title_en: text(160),
    slug: z
      .string()
      .trim()
      .transform((v) => (v ? slugify(v) : "")),
    curatorial_text: text(8000),
    curatorial_text_en: text(8000),
    starts_at: z.iso.date(),
    ends_at: z.iso.date(),
    room_theme: z.enum(["dark", "museum"]),
    is_published: checkbox,
    is_current: checkbox,
  })
  .refine((v) => v.ends_at >= v.starts_at, { path: ["ends_at"] })
  .refine((v) => !v.is_current || v.is_published, { path: ["is_current"] });

export type ExhibitionFormState = { ok?: boolean; error?: "invalid" | "slug" | "generic" | "auth"; fields?: string[] };

export async function saveExhibition(_prev: ExhibitionFormState, formData: FormData): Promise<ExhibitionFormState> {
  const ctx = await adminContext();
  if (!ctx) return { error: "auth" };
  const parsed = exhibitionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "invalid", fields: parsed.error.issues.map((i) => String(i.path[0])) };
  const { id, slug: rawSlug, ...fields } = parsed.data;
  const { supabase, userId } = ctx;

  // Une seule exposition en cours : on libère l'ancienne d'abord.
  if (fields.is_current) {
    let unset = supabase.from("exhibitions").update({ is_current: false }).eq("is_current", true);
    if (id) unset = unset.neq("id", id);
    await unset;
  }

  let targetId = id;
  if (id) {
    const { error } = await supabase
      .from("exhibitions")
      .update({ ...fields, ...(rawSlug ? { slug: rawSlug } : {}) })
      .eq("id", id);
    if (error) return { error: error.code === "23505" ? "slug" : "generic" };
  } else {
    const base = rawSlug || slugify(fields.title);
    const { data: taken } = await supabase.from("exhibitions").select("slug").like("slug", `${base}%`);
    const { data, error } = await supabase
      .from("exhibitions")
      .insert({ ...fields, slug: uniqueSlug(base, (taken ?? []).map((t) => t.slug)), created_by: userId })
      .select("id")
      .single();
    if (error || !data) return { error: "generic" };
    targetId = data.id;
    await supabase.from("exhibition_rooms").insert({ exhibition_id: data.id, name: "Salle 1", name_en: "Room 1", position: 1 });
  }
  done();
  if (!id) redirect({ href: `/admin/expositions/${targetId}`, locale: await getLocale() });
  return { ok: true };
}

export async function deleteExhibition(formData: FormData): Promise<void> {
  const ctx = await adminContext();
  const id = uuid.safeParse(formData.get("id"));
  if (!ctx || !id.success) return;
  await ctx.supabase.from("exhibitions").delete().eq("id", id.data);
  done();
  redirect({ href: "/admin/expositions", locale: await getLocale() });
}

// ------------------------------------------------------------------ salles
export async function saveRoom(formData: FormData): Promise<void> {
  const ctx = await adminContext();
  const parsed = z
    .object({
      id: z.preprocess((v) => (v === undefined || v === null || v === "" ? undefined : v), uuid.optional()),
      exhibition_id: uuid,
      name: z.string().trim().min(1).max(120),
      name_en: text(120),
      position: z.coerce.number().int().min(0).max(999),
    })
    .safeParse(Object.fromEntries(formData));
  if (!ctx || !parsed.success) return;
  const { id, ...room } = parsed.data;
  if (id) await ctx.supabase.from("exhibition_rooms").update(room).eq("id", id);
  else await ctx.supabase.from("exhibition_rooms").insert(room);
  done();
}

export async function deleteRoom(formData: FormData): Promise<void> {
  const ctx = await adminContext();
  const id = uuid.safeParse(formData.get("id"));
  if (!ctx || !id.success) return;
  // Les œuvres placées repassent en « validées, non accrochées » (FK on delete set null).
  await ctx.supabase.from("exhibition_artworks").update({ room_id: null, wall: null }).eq("room_id", id.data);
  await ctx.supabase.from("exhibition_rooms").delete().eq("id", id.data);
  done();
}

// --------------------------------------------------- validation des œuvres
export async function reviewPlacement(formData: FormData): Promise<void> {
  const ctx = await adminContext();
  const exhibitionId = uuid.safeParse(formData.get("exhibitionId"));
  const artworkId = uuid.safeParse(formData.get("artworkId"));
  if (!ctx || !exhibitionId.success || !artworkId.success) return;
  const decision = formData.get("decision");

  if (decision === "add") {
    await ctx.supabase
      .from("exhibition_artworks")
      .insert({ exhibition_id: exhibitionId.data, artwork_id: artworkId.data, status: "approved", proposed_by: ctx.userId });
  } else if (decision === "remove") {
    await ctx.supabase.from("exhibition_artworks").delete().eq("exhibition_id", exhibitionId.data).eq("artwork_id", artworkId.data);
  } else {
    await ctx.supabase
      .from("exhibition_artworks")
      .update({ status: decision === "approve" ? "approved" : "rejected", room_id: null, wall: null })
      .eq("exhibition_id", exhibitionId.data)
      .eq("artwork_id", artworkId.data);
  }
  done();
}

// ------------------------------------------------------- éditeur de salle
const layoutSchema = z.object({
  exhibitionId: uuid,
  roomId: uuid,
  placements: z
    .array(z.object({ artworkId: uuid, wall: z.enum(["north", "east", "south", "west"]).nullable(), position: z.number().int().min(0) }))
    .max(200),
});

export async function saveRoomLayout(input: z.input<typeof layoutSchema>): Promise<{ ok: boolean }> {
  const ctx = await adminContext();
  const parsed = layoutSchema.safeParse(input);
  if (!ctx || !parsed.success) return { ok: false };
  const { exhibitionId, roomId, placements } = parsed.data;

  for (const p of placements) {
    const { error } = await ctx.supabase
      .from("exhibition_artworks")
      .update(p.wall ? { room_id: roomId, wall: p.wall, position: p.position } : { room_id: null, wall: null, position: 0 })
      .eq("exhibition_id", exhibitionId)
      .eq("artwork_id", p.artworkId)
      .eq("status", "approved");
    if (error) return { ok: false };
  }
  done();
  return { ok: true };
}

// ------------------------------------------------- mises en avant, modération
export async function setArtworkFlag(formData: FormData): Promise<void> {
  const ctx = await adminContext();
  const id = uuid.safeParse(formData.get("id"));
  const flag = formData.get("flag");
  if (!ctx || !id.success || (flag !== "is_featured" && flag !== "is_published")) return;
  await ctx.supabase
    .from("artworks")
    .update(flag === "is_featured" ? { is_featured: formData.get("value") === "true" } : { is_published: formData.get("value") === "true" })
    .eq("id", id.data);
  done();
}
