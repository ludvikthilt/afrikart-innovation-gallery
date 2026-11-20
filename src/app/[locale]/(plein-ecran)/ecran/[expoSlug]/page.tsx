import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Slideshow } from "@/components/kiosk/slideshow";
import { getVisit } from "@/lib/data/visit";

export const metadata: Metadata = { robots: { index: false } };

/** Mode écran : /ecran/<expo>?duree=12 (secondes par œuvre, 5 à 120). */
export default async function ScreenPage({ params, searchParams }: PageProps<"/[locale]/ecran/[expoSlug]">) {
  const [{ expoSlug }, query] = await Promise.all([params, searchParams]);
  const visit = await getVisit(expoSlug);
  if (!visit || visit.rooms.length === 0) notFound();
  const seconds = Math.min(120, Math.max(5, Number(query.duree) || 12));
  return <Slideshow exhibition={visit} seconds={seconds} />;
}
