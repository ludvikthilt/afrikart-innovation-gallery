import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AdminDashboard() {
  const supabase = await createClient();
  const head = { count: "exact" as const, head: true };
  const [t, requests, proposals, artists, artworks, comments] = await Promise.all([
    getTranslations("admin"),
    supabase.from("artist_requests").select("id", head).eq("status", "pending"),
    supabase.from("exhibition_artworks").select("artwork_id", head).eq("status", "proposed"),
    supabase.from("profiles").select("id", head).eq("role", "artist"),
    supabase.from("artworks").select("id", head).eq("is_published", true),
    supabase.from("comments").select("id", head),
  ]);
  const tiles = [
    { label: t("stats.requests"), value: requests.count ?? 0, href: "/admin/demandes" },
    { label: t("stats.proposals"), value: proposals.count ?? 0, href: "/admin/expositions" },
    { label: t("stats.artists"), value: artists.count ?? 0, href: "/artistes" },
    { label: t("stats.artworks"), value: artworks.count ?? 0, href: "/admin/mises-en-avant" },
    { label: t("stats.comments"), value: comments.count ?? 0, href: "/admin/moderation" },
  ];

  return (
    <div className="flex flex-col gap-10">
      <h1 className="font-serif text-4xl">{t("title")}</h1>
      <ul className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {tiles.map((tile) => (
          <li key={tile.label}>
            <Link href={tile.href} className="flex flex-col gap-1 rounded-sm border border-hairline-soft bg-surface p-5 hover:border-accent/60">
              <span className="label-caps text-ink-muted">{tile.label}</span>
              <span className="font-label text-3xl">{tile.value}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
