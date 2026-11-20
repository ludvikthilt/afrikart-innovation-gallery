import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { MessageRow } from "@/types/database";

type Person = { id: string; display_name: string; username: string | null; avatar_url: string | null };

export type ConversationSummary = {
  id: string;
  other: Person;
  artwork: { title: string; slug: string } | null;
  lastMessage: Pick<MessageRow, "body" | "created_at" | "sender_id"> | null;
  unread: number;
  last_message_at: string;
};

const CONVERSATION_FIELDS = `id, artist_id, visitor_id, last_message_at,
  artist:profiles!conversations_artist_id_fkey(id, display_name, username, avatar_url),
  visitor:profiles!conversations_visitor_id_fkey(id, display_name, username, avatar_url),
  artwork:artworks!conversations_artwork_id_fkey(title, slug)`;

type RawConversation = {
  id: string;
  artist_id: string;
  visitor_id: string;
  last_message_at: string;
  artist: Person;
  visitor: Person;
  artwork: { title: string; slug: string } | null;
};

export async function listConversations(userId: string): Promise<ConversationSummary[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("conversations")
    .select(CONVERSATION_FIELDS)
    .or(`artist_id.eq.${userId},visitor_id.eq.${userId}`)
    .order("last_message_at", { ascending: false })
    .limit(100);
  const conversations = (data ?? []) as unknown as RawConversation[];
  if (conversations.length === 0) return [];

  const { data: messages } = await supabase
    .from("messages")
    .select("conversation_id, body, created_at, sender_id, read_at")
    .in(
      "conversation_id",
      conversations.map((c) => c.id),
    )
    .order("created_at", { ascending: false })
    .limit(1000);

  return conversations.map((c) => {
    const own = (messages ?? []).filter((m) => m.conversation_id === c.id);
    return {
      id: c.id,
      other: c.artist_id === userId ? c.visitor : c.artist,
      artwork: c.artwork,
      lastMessage: own[0] ?? null,
      unread: own.filter((m) => !m.read_at && m.sender_id !== userId).length,
      last_message_at: c.last_message_at,
    };
  });
}

export async function getConversation(id: string, userId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("conversations").select(CONVERSATION_FIELDS).eq("id", id).maybeSingle();
  if (!data) return null;
  const c = data as unknown as RawConversation;
  const { data: messages } = await supabase
    .from("messages")
    .select("id, conversation_id, sender_id, body, read_at, created_at")
    .eq("conversation_id", id)
    .order("created_at")
    .limit(500);
  return {
    id: c.id,
    me: c.artist_id === userId ? c.artist : c.visitor,
    other: c.artist_id === userId ? c.visitor : c.artist,
    iAmArtist: c.artist_id === userId,
    artwork: c.artwork,
    messages: messages ?? [],
  };
}

/** Messages reçus non lus (mis en cache pour la requête : barre + menu mobile). */
export const countUnread = cache(async (userId: string): Promise<number> => {
  const supabase = await createClient();
  const { count } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .is("read_at", null)
    .neq("sender_id", userId);
  return count ?? 0;
});
