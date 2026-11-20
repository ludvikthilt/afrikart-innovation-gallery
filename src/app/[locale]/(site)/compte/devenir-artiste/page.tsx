import { getFormatter, getTranslations } from "next-intl/server";
import { ArtistRequestForm } from "@/components/account/artist-request-form";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/** Demande pour devenir artiste : bio, liens, 1 à 5 œuvres d'exemple, motivation. */
export default async function BecomeArtistPage() {
  const me = await requireRole(["visitor"], "/compte/devenir-artiste");
  const supabase = await createClient();
  const [t, format, { data: requests }] = await Promise.all([
    getTranslations("becomeArtist"),
    getFormatter(),
    supabase.from("artist_requests").select("id, status, admin_note, created_at").eq("user_id", me.id).order("created_at", { ascending: false }),
  ]);
  const pending = requests?.find((r) => r.status === "pending");
  const lastRejected = requests?.find((r) => r.status === "rejected");

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-12 sm:px-8">
      <header>
        <h1 className="font-serif text-4xl">{t("title")}</h1>
        <p className="mt-2 text-ink-soft">{t("intro")}</p>
      </header>
      {pending ? (
        <p role="status" className="hairline-frame rounded-sm p-5">
          {t("pending", { date: format.dateTime(new Date(pending.created_at), { dateStyle: "long" }) })}
        </p>
      ) : (
        <>
          {lastRejected && (
            <div className="rounded-sm border border-hairline-soft p-5 text-sm text-ink-soft">
              <p>{t("rejected")}</p>
              {lastRejected.admin_note && <p className="mt-2 italic">« {lastRejected.admin_note} »</p>}
            </div>
          )}
          <ArtistRequestForm userId={me.id} />
        </>
      )}
    </div>
  );
}
