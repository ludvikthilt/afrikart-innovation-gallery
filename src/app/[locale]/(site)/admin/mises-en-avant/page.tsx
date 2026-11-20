import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { setArtworkFlag } from "@/actions/admin";
import { Link } from "@/i18n/navigation";
import { artworkImageUrl } from "@/lib/images";
import { createClient } from "@/lib/supabase/server";

/** Œuvres mises en avant dans la vitrine du hall. */
export default async function AdminFeatured() {
  const supabase = await createClient();
  const [t, { data }] = await Promise.all([
    getTranslations("admin"),
    supabase
      .from("artworks")
      .select("id, slug, title, is_featured, image_path, image_medium_path, image_thumb_path, dominant_color, artist:profiles!artworks_artist_id_fkey(display_name)")
      .eq("is_published", true)
      .order("is_featured", { ascending: false })
      .order("title"),
  ]);
  const artworks = (data ?? []) as unknown as {
    id: string;
    slug: string;
    title: string;
    is_featured: boolean;
    image_path: string;
    image_medium_path: string | null;
    image_thumb_path: string | null;
    dominant_color: string | null;
    artist: { display_name: string } | null;
  }[];

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="font-serif text-4xl">{t("nav.featured")}</h1>
        <p className="mt-2 text-ink-soft">{t("featuredIntro")}</p>
      </header>
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {artworks.map((a) => (
          <li key={a.id} className={`flex items-center gap-3 rounded-sm border p-3 ${a.is_featured ? "border-accent/60 bg-surface" : "border-hairline-soft"}`}>
            <span className="relative size-14 shrink-0 overflow-hidden" style={{ backgroundColor: a.dominant_color ?? "#222" }}>
              <Image src={artworkImageUrl(a, "thumb")} alt="" fill sizes="56px" className="object-cover" />
            </span>
            <Link href={`/oeuvres/${a.slug}`} className="flex min-w-0 flex-1 flex-col hover:text-accent">
              <span className="truncate font-serif italic">{a.title}</span>
              <span className="truncate text-xs text-ink-muted">{a.artist?.display_name}</span>
            </Link>
            <form action={setArtworkFlag}>
              <input type="hidden" name="id" value={a.id} />
              <input type="hidden" name="flag" value="is_featured" />
              <input type="hidden" name="value" value={String(!a.is_featured)} />
              <button type="submit" aria-pressed={a.is_featured} className={`btn min-h-8 px-3 ${a.is_featured ? "btn-primary" : "btn-secondary"}`}>
                {a.is_featured ? t("featured") : t("feature")}
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
