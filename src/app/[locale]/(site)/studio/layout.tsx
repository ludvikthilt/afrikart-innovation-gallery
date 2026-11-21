import { getTranslations } from "next-intl/server";
import { SideNav } from "@/components/layout/side-nav";
import { requireRole } from "@/lib/auth";
import { countUnread } from "@/lib/data/messages";

// Vérification serveur du rôle (le proxy ne vérifie que la connexion).
export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const me = await requireRole(["artist", "admin"], "/studio");
  const [t, unread] = await Promise.all([getTranslations("studio"), countUnread(me.id)]);
  return (
    <div className="mx-auto grid w-full max-w-[1600px] flex-1 grid-cols-[minmax(0,1fr)] content-start gap-6 px-4 py-6 sm:px-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-8 lg:px-12 lg:py-8">
      <aside className="flex min-w-0 flex-col gap-4">
        <p className="label-caps hidden text-accent lg:block">{t("title")}</p>
        <SideNav
          label={t("title")}
          items={[
            { href: "/studio", label: t("nav.dashboard") },
            { href: "/studio/oeuvres", label: t("nav.artworks") },
            { href: "/studio/collections", label: t("nav.collections") },
            { href: "/studio/propositions", label: t("nav.proposals") },
            { href: "/messages", label: t("nav.messages"), badge: unread },
            { href: "/studio/commentaires", label: t("nav.comments") },
            { href: "/compte", label: t("nav.profile") },
          ]}
        />
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
