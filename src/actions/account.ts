"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { processAvatar } from "@/lib/image-pipeline";
import { createClient } from "@/lib/supabase/server";

async function userContext() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  return userId ? { supabase, userId } : null;
}

// -------------------------------------------------- demande pour devenir artiste
export type ArtistRequestState = { ok?: boolean; error?: "invalid" | "generic" | "auth" | "pending" };

const requestSchema = z.object({
  motivation: z.string().trim().min(20).max(3000),
  portfolio_links: z
    .string()
    .transform((v) =>
      v
        .split(/\s+/)
        .map((s) => s.trim())
        .filter(Boolean),
    )
    .pipe(z.array(z.url({ protocol: /^https?$/ })).max(5)),
  sample_images: z
    .string()
    .transform((v) => JSON.parse(v || "[]") as unknown)
    .pipe(z.array(z.string()).min(1).max(5)),
});

export async function createArtistRequest(_prev: ArtistRequestState, formData: FormData): Promise<ArtistRequestState> {
  const ctx = await userContext();
  if (!ctx) return { error: "auth" };
  let parsed;
  try {
    parsed = requestSchema.safeParse(Object.fromEntries(formData));
  } catch {
    return { error: "invalid" };
  }
  if (!parsed.success) return { error: "invalid" };
  if (parsed.data.sample_images.some((p) => !p.startsWith(`${ctx.userId}/`) || p.includes(".."))) return { error: "invalid" };

  const { error } = await ctx.supabase.from("artist_requests").insert({ user_id: ctx.userId, ...parsed.data });
  if (error) return { error: error.code === "23505" ? "pending" : "generic" };
  revalidatePath("/compte", "layout");
  return { ok: true };
}

// ------------------------------------------------------------------- avatar
export async function setAvatar(originalPath: string): Promise<{ ok: boolean }> {
  const ctx = await userContext();
  if (!ctx) return { ok: false };
  try {
    const path = await processAvatar(ctx.supabase, ctx.userId, originalPath);
    const { data: previous } = await ctx.supabase.from("profiles").select("avatar_url").eq("id", ctx.userId).single();
    await ctx.supabase.from("profiles").update({ avatar_url: path }).eq("id", ctx.userId);
    if (previous?.avatar_url && !previous.avatar_url.startsWith("http")) {
      await ctx.supabase.storage.from("avatars").remove([previous.avatar_url]);
    }
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    console.error("avatar", error);
    return { ok: false };
  }
}
