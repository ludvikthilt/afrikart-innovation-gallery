"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { redirect } from "@/i18n/navigation";
import { safeNextPath } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

async function currentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims?.sub ?? null;
}

const uuid = z.uuid();

// ------------------------------------------------------------------- likes
export type LikeResult = { liked: boolean; likes: number } | { error: "auth" | "generic" };

export async function toggleLike(artworkId: string): Promise<LikeResult> {
  if (!uuid.safeParse(artworkId).success) return { error: "generic" };
  const userId = await currentUserId();
  if (!userId) return { error: "auth" };
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("likes")
    .select("artwork_id")
    .eq("user_id", userId)
    .eq("artwork_id", artworkId)
    .maybeSingle();

  const { error } = existing
    ? await supabase.from("likes").delete().eq("user_id", userId).eq("artwork_id", artworkId)
    : await supabase.from("likes").insert({ user_id: userId, artwork_id: artworkId });
  if (error) return { error: "generic" };

  const { count } = await supabase.from("likes").select("user_id", { count: "exact", head: true }).eq("artwork_id", artworkId);
  return { liked: !existing, likes: count ?? 0 };
}

// --------------------------------------------------------------- comments
export type CommentView = {
  id: string;
  body: string;
  created_at: string;
  is_hidden: boolean;
  mine: boolean;
  author: { display_name: string; username: string | null; avatar_url: string | null } | null;
};

export type CommentsPayload = { comments: CommentView[]; canModerate: boolean };

export async function getComments(artworkId: string): Promise<CommentsPayload> {
  if (!uuid.safeParse(artworkId).success) return { comments: [], canModerate: false };
  const supabase = await createClient();
  const userId = await currentUserId();

  const [{ data }, { data: artwork }, { data: me }] = await Promise.all([
    supabase
      .from("comments")
      .select("id, body, created_at, is_hidden, user_id, author:profiles!comments_user_id_fkey(display_name, username, avatar_url)")
      .eq("artwork_id", artworkId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.from("artworks").select("artist_id").eq("id", artworkId).maybeSingle(),
    userId ? supabase.from("profiles").select("role").eq("id", userId).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  return {
    canModerate: Boolean(userId && (artwork?.artist_id === userId || me?.role === "admin")),
    comments: (data ?? []).map((c) => ({
      id: c.id,
      body: c.body,
      created_at: c.created_at,
      is_hidden: c.is_hidden,
      mine: c.user_id === userId,
      author: c.author as unknown as CommentView["author"],
    })),
  };
}

const commentSchema = z.object({ artworkId: uuid, body: z.string().trim().min(1).max(1000) });

export async function addComment(artworkId: string, body: string): Promise<{ ok: true } | { error: "auth" | "invalid" | "generic" }> {
  const parsed = commentSchema.safeParse({ artworkId, body });
  if (!parsed.success) return { error: "invalid" };
  const userId = await currentUserId();
  if (!userId) return { error: "auth" };
  const supabase = await createClient();
  const { error } = await supabase.from("comments").insert({ artwork_id: artworkId, user_id: userId, body: parsed.data.body });
  return error ? { error: "generic" } : { ok: true };
}

/** Masquer / réafficher : l'artiste de l'œuvre ou un admin (vérifié en base). */
export async function setCommentHidden(commentId: string, hidden: boolean): Promise<{ ok: boolean }> {
  if (!uuid.safeParse(commentId).success) return { ok: false };
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("comments")
    .update({ is_hidden: hidden }, { count: "exact" })
    .eq("id", commentId);
  return { ok: !error && count !== 0 };
}

export async function deleteComment(commentId: string): Promise<{ ok: boolean }> {
  if (!uuid.safeParse(commentId).success) return { ok: false };
  const supabase = await createClient();
  const { error, count } = await supabase.from("comments").delete({ count: "exact" }).eq("id", commentId);
  return { ok: !error && count !== 0 };
}

/** Variante formulaire (studio, admin) : action = hide | show | delete. */
export async function moderateComment(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const action = formData.get("action");
  if (action === "delete") await deleteComment(id);
  else await setCommentHidden(id, action === "hide");
  revalidatePath("/", "layout");
}

// ---------------------------------------------------------------- contact
const contactSchema = z.object({
  artistId: uuid,
  artworkId: uuid.optional().or(z.literal("").transform(() => undefined)),
  intent: z.enum(["contact", "interest"]),
  from: z.string().optional(),
});

/**
 * « Contacter l'artiste » / « Je suis intéressé·e » : ouvre (ou retrouve) la
 * conversation, avec un message pré-rempli pour l'intérêt d'achat.
 */
export async function contactArtist(formData: FormData): Promise<void> {
  const locale = await getLocale();
  const parsed = contactSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const { artistId, artworkId, intent } = parsed.data;
  const from = safeNextPath(parsed.data.from, "/");

  const userId = await currentUserId();
  if (!userId) {
    redirect({ href: { pathname: "/connexion", query: { next: from } }, locale });
    return;
  }
  if (userId === artistId) {
    redirect({ href: "/messages", locale });
    return;
  }

  const supabase = await createClient();
  let query = supabase.from("conversations").select("id").eq("artist_id", artistId).eq("visitor_id", userId);
  query = artworkId ? query.eq("artwork_id", artworkId) : query.is("artwork_id", null);
  const { data: existing } = await query.maybeSingle();

  let conversationId = existing?.id;
  if (!conversationId) {
    const { data: created } = await supabase
      .from("conversations")
      .insert({ artist_id: artistId, visitor_id: userId, artwork_id: artworkId ?? null })
      .select("id")
      .single();
    conversationId = created?.id;
  }
  if (!conversationId) {
    redirect({ href: "/messages", locale });
    return;
  }

  redirect({
    href: { pathname: `/messages/${conversationId}`, query: intent === "interest" ? { brouillon: "interet" } : {} },
    locale,
  });
}
