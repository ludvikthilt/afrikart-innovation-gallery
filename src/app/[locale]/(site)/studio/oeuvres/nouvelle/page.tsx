import { getTranslations } from "next-intl/server";
import { ArtworkForm } from "@/components/studio/artwork-form";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function NewArtwork() {
  const me = await requireRole(["artist", "admin"], "/studio/oeuvres/nouvelle");
  const supabase = await createClient();
  const [t, { data: collections }] = await Promise.all([
    getTranslations("studio"),
    supabase.from("collections").select("id, title").eq("artist_id", me.id).order("title"),
  ]);
  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-serif text-4xl">{t("addArtwork")}</h1>
      <ArtworkForm userId={me.id} collections={collections ?? []} />
    </div>
  );
}
