import { getTranslations } from "next-intl/server";
import { deleteCollection } from "@/actions/studio";
import { CollectionForm } from "@/components/studio/collection-form";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Link } from "@/i18n/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function StudioCollections() {
  const me = await requireRole(["artist", "admin"], "/studio/collections");
  const supabase = await createClient();
  const [t, { data: collections }, { data: artworks }] = await Promise.all([
    getTranslations("studio"),
    supabase
      .from("collections")
      .select("id, title, slug, description, description_en, year, is_published, cover_artwork_id")
      .eq("artist_id", me.id)
      .order("created_at"),
    supabase.from("artworks").select("id, title, collection_id").eq("artist_id", me.id).order("title"),
  ]);

  return (
    <div className="flex flex-col gap-10">
      <h1 className="font-serif text-4xl">{t("nav.collections")}</h1>
      {(collections ?? []).map((c) => {
        const inside = (artworks ?? []).filter((a) => a.collection_id === c.id);
        return (
          <details key={c.id} className="rounded-sm border border-hairline-soft bg-surface">
            <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4">
              <span className="font-serif text-xl italic">{c.title}</span>
              <span className="label-caps text-ink-muted">
                {t("collectionCount", { count: inside.length })} · {c.is_published ? t("chip.published") : t("chip.draft")}
              </span>
            </summary>
            <div className="flex flex-col gap-6 border-t border-hairline-soft p-5">
              <CollectionForm collection={c} artworks={inside} />
              <div className="flex items-center justify-between">
                <Link href={`/collections/${c.slug}`} className="text-sm text-ink-soft hover:text-accent">
                  {t("viewPublic")}
                </Link>
                <form action={deleteCollection}>
                  <input type="hidden" name="id" value={c.id} />
                  <ConfirmButton message={t("deleteCollectionConfirm")} className="text-sm text-danger hover:underline">
                    {t("delete")}
                  </ConfirmButton>
                </form>
              </div>
            </div>
          </details>
        );
      })}
      <section className="flex flex-col gap-4 rounded-sm border border-dashed border-hairline p-5">
        <h2 className="label-caps text-ink-soft">{t("newCollection")}</h2>
        <CollectionForm artworks={[]} />
      </section>
    </div>
  );
}
