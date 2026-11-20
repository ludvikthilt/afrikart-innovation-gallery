import "server-only";
import { cache } from "react";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { ProfileRow, UserRole } from "@/types/database";

export type SessionProfile = Pick<
  ProfileRow,
  "id" | "display_name" | "username" | "avatar_url" | "role" | "preferred_locale"
>;

/** Profil de l'utilisateur connecté, lu une fois par requête. null si anonyme. */
export const getCurrentProfile = cache(async (): Promise<SessionProfile | null> => {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, display_name, username, avatar_url, role, preferred_locale")
    .eq("id", userId)
    .single();
  return data;
});

/**
 * Garde côté serveur des zones réservées (le proxy ne fait qu'une
 * vérification optimiste). Redirige vers la connexion ou le hall.
 */
export async function requireRole(roles: readonly UserRole[], nextPath: string): Promise<SessionProfile> {
  const [profile, locale] = await Promise.all([getCurrentProfile(), getLocale()]);
  if (!profile) {
    return redirect({ href: { pathname: "/connexion", query: { next: nextPath } }, locale });
  }
  if (!roles.includes(profile.role)) {
    return redirect({ href: "/", locale });
  }
  return profile;
}

/** N'accepte que des chemins internes pour les redirections « next ». */
export function safeNextPath(value: unknown, fallback = "/compte"): string {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") ? value : fallback;
}
