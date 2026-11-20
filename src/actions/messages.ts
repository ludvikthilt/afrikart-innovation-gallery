"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { MessageRow } from "@/types/database";

const schema = z.object({ conversationId: z.uuid(), body: z.string().trim().min(1).max(4000) });

export async function sendMessage(
  conversationId: string,
  body: string,
): Promise<{ message: MessageRow } | { error: "invalid" | "auth" | "generic" }> {
  const parsed = schema.safeParse({ conversationId, body });
  if (!parsed.success) return { error: "invalid" };
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return { error: "auth" };

  const { data, error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: userId, body: parsed.data.body })
    .select("id, conversation_id, sender_id, body, read_at, created_at")
    .single();
  return error || !data ? { error: "generic" } : { message: data };
}

/** Marque comme lus les messages reçus dans une conversation. */
export async function markConversationRead(conversationId: string): Promise<void> {
  if (!z.uuid().safeParse(conversationId).success) return;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return;
  await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .neq("sender_id", userId)
    .is("read_at", null);
}
