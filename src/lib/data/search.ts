import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { SearchResult } from "@/types/database";

export async function searchGallery(q: string, max = 6): Promise<SearchResult[]> {
  const query = q.trim().slice(0, 100);
  if (query.length < 2 || !isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data } = await supabase.rpc("search_gallery", { q: query, max_results: max });
  return data ?? [];
}
