import { getFormatter, getTranslations } from "next-intl/server";
import { reviewRequest } from "@/actions/admin";
import { Avatar } from "@/components/ui/avatar";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { createClient } from "@/lib/supabase/server";

/** Demandes pour devenir artiste : examen du dossier, validation ou refus motivé. */
export default async function AdminRequests() {
  const supabase = await createClient();
  const [t, format, { data }] = await Promise.all([
    getTranslations("admin"),
    getFormatter(),
    supabase
      .from("artist_requests")
      .select("id, motivation, portfolio_links, sample_images, status, admin_note, created_at, reviewed_at, user:profiles!artist_requests_user_id_fkey(display_name, avatar_url, city, country)")
      .order("status")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);
  const requests = (data ?? []) as unknown as {
    id: string;
    motivation: string;
    portfolio_links: string[];
    sample_images: string[];
    status: "pending" | "approved" | "rejected";
    admin_note: string | null;
    created_at: string;
    user: { display_name: string; avatar_url: string | null; city: string | null; country: string | null } | null;
  }[];

  // Œuvres d'exemple : bucket privé, liens signés valables 1 h.
  const paths = requests.flatMap((r) => r.sample_images);
  const { data: signed } = paths.length
    ? await supabase.storage.from("artist-requests").createSignedUrls(paths, 3600)
    : { data: [] as { path: string | null; signedUrl: string }[] };
  const urlOf = (path: string) => signed?.find((s) => s.path === path)?.signedUrl;

  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-serif text-4xl">{t("nav.requests")}</h1>
      {requests.length === 0 && <p className="text-ink-soft">{t("noRequests")}</p>}
      <ul className="flex flex-col gap-6">
        {requests.map((r) => (
          <li key={r.id} className={`flex flex-col gap-4 rounded-sm border p-5 ${r.status === "pending" ? "border-accent/50 bg-surface" : "border-hairline-soft opacity-75"}`}>
            <header className="flex flex-wrap items-center gap-3">
              <Avatar name={r.user?.display_name ?? "?"} url={r.user?.avatar_url ?? null} />
              <div className="flex flex-col">
                <span className="font-semibold">{r.user?.display_name}</span>
                <span className="text-sm text-ink-muted">
                  {[r.user?.city, r.user?.country].filter(Boolean).join(", ")} · {format.dateTime(new Date(r.created_at), { dateStyle: "medium" })}
                </span>
              </div>
              <span className="label-caps ml-auto text-ink-soft">{t(`requestStatus.${r.status}`)}</span>
            </header>
            <p className="whitespace-pre-line text-ink-soft">{r.motivation}</p>
            {r.portfolio_links.length > 0 && (
              <ul className="flex flex-wrap gap-3 text-sm">
                {r.portfolio_links.map((l) => (
                  <li key={l}>
                    <a href={l} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                      {l.replace(/^https?:\/\//, "")}
                    </a>
                  </li>
                ))}
              </ul>
            )}
            <ul className="flex flex-wrap gap-3">
              {r.sample_images.map((p) => {
                const url = urlOf(p);
                return url ? (
                  <li key={p}>
                    <a href={url} target="_blank" rel="noopener noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={t("sample")} className="size-28 rounded-sm object-cover" />
                    </a>
                  </li>
                ) : null;
              })}
            </ul>
            {r.status === "pending" ? (
              <form action={reviewRequest} className="flex flex-col gap-3 border-t border-hairline-soft pt-4">
                <input type="hidden" name="id" value={r.id} />
                <label htmlFor={`note-${r.id}`} className="field-label">
                  {t("note")}
                </label>
                <textarea id={`note-${r.id}`} name="note" rows={2} className="field-input min-h-0" />
                <div className="flex gap-3">
                  <button type="submit" name="decision" value="approve" className="btn btn-primary">
                    {t("approve")}
                  </button>
                  <ConfirmButton name="decision" value="reject" message={t("rejectConfirm")} className="btn btn-secondary">
                    {t("reject")}
                  </ConfirmButton>
                </div>
              </form>
            ) : (
              r.admin_note && <p className="text-sm italic text-ink-muted">« {r.admin_note} »</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
