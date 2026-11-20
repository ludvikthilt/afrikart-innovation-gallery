import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Kiosk } from "@/components/kiosk/kiosk";
import { settings } from "@/config/brand";
import { getCurrentExhibitionSlug, getVisit } from "@/lib/data/visit";

export const metadata: Metadata = { robots: { index: false } };

/** Mode borne : /borne (plein écran, tactile, sans compte). */
export default async function KioskPage() {
  const slug = await getCurrentExhibitionSlug();
  const visit = slug ? await getVisit(slug) : null;
  if (!visit || visit.rooms.length === 0) {
    const t = await getTranslations("hall");
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-10 text-center">
        <h1 className="font-serif text-5xl">{t("emptyTitle")}</h1>
        <p className="text-xl text-ink-soft">{t("emptyText")}</p>
      </div>
    );
  }
  return <Kiosk exhibition={visit} idleMinutes={settings.kioskIdleMinutes} />;
}
