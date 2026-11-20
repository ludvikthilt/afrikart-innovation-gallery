import { getTranslations } from "next-intl/server";
import { SideNav } from "@/components/layout/side-nav";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Vérification serveur du rôle (le proxy ne vérifie que la connexion).
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["admin"], "/admin");
  const supabase = await createClient();
  const [t, { count: requests }, { count: proposals }] = await Promise.all([
    getTranslations("admin"),
    supabase.from("artist_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("exhibition_artworks").select("artwork_id", { count: "exact", head: true }).eq("status", "proposed"),
  ]);
  return (
    <div className="mx-auto grid w-full max-w-[1600px] flex-1 gap-8 px-4 py-8 sm:px-8 lg:grid-cols-[220px_1fr] lg:px-12">
      <aside className="flex flex-col gap-4">
        <p className="label-caps hidden text-accent lg:block">{t("title")}</p>
        <SideNav
          label={t("title")}
          items={[
            { href: "/admin", label: t("nav.dashboard") },
            { href: "/admin/demandes", label: t("nav.requests"), badge: requests ?? 0 },
            { href: "/admin/expositions", label: t("nav.exhibitions"), badge: proposals ?? 0 },
            { href: "/admin/mises-en-avant", label: t("nav.featured") },
            { href: "/admin/moderation", label: t("nav.moderation") },
          ]}
        />
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
