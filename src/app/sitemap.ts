import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { settings } from "@/config/brand";
import { routing } from "@/i18n/routing";
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";
import type { Database } from "@/types/database";

export const revalidate = 3600;

/** Pages publiques dans les deux langues (le français sans préfixe). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const paths = ["/", "/expositions", "/artistes"];

  if (isSupabaseConfigured) {
    // Client anonyme sans cookies : seules les données publiques (RLS).
    const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
    const [artworks, artists, collections, exhibitions] = await Promise.all([
      supabase.from("artworks").select("slug").eq("is_published", true),
      supabase.from("profiles").select("username").eq("role", "artist").not("username", "is", null),
      supabase.from("collections").select("slug").eq("is_published", true),
      supabase.from("exhibitions").select("slug").eq("is_published", true),
    ]);
    paths.push(
      ...(artworks.data ?? []).map((a) => `/oeuvres/${a.slug}`),
      ...(artists.data ?? []).map((a) => `/artistes/${a.username}`),
      ...(collections.data ?? []).map((c) => `/collections/${c.slug}`),
      ...(exhibitions.data ?? []).map((e) => `/visite/${e.slug}`),
    );
  }

  const url = (locale: string, path: string) =>
    `${settings.siteUrl}${locale === routing.defaultLocale ? "" : `/${locale}`}${path === "/" && locale !== routing.defaultLocale ? "" : path}`;

  return paths.map((path) => ({
    url: url(routing.defaultLocale, path),
    alternates: { languages: Object.fromEntries(routing.locales.map((l) => [l, url(l, path)])) },
  }));
}
