import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";
import type { Database } from "@/types/database";
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "./env";

/**
 * Rafraîchit la session Supabase sur la réponse déjà préparée (par next-intl)
 * et renvoie l'id utilisateur s'il est connecté.
 */
export async function refreshSession(request: NextRequest, response: NextResponse): Promise<string | null> {
  if (!isSupabaseConfigured) return null;

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // getClaims() valide le JWT (et le rafraîchit si besoin) : à appeler avant tout le reste.
  const { data } = await supabase.auth.getClaims();
  return data?.claims?.sub ?? null;
}
