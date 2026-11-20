"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArtImage } from "@/components/gallery/art-image";
import { Cartel } from "@/components/gallery/cartel";
import { Logo } from "@/components/layout/logo";
import type { Locale } from "@/i18n/routing";
import { localized } from "@/lib/format";
import type { VisitArtwork, VisitExhibition } from "@/lib/visit/types";

/**
 * Diaporama automatique pour un écran vertical ou un vidéoprojecteur :
 * œuvre plein cadre, cartel, QR pour continuer sur son téléphone.
 */
export function Slideshow({ exhibition, seconds }: { exhibition: VisitExhibition; seconds: number }) {
  const t = useTranslations("kiosk");
  const locale = useLocale() as Locale;
  const artworks: VisitArtwork[] = exhibition.rooms.flatMap((r) => r.walls.flatMap((w) => w.artworks));
  const [index, setIndex] = useState(0);
  const current = artworks[index % artworks.length];
  const next = artworks[(index + 1) % artworks.length];

  useEffect(() => {
    const timer = setInterval(() => setIndex((i) => i + 1), seconds * 1000);
    return () => clearInterval(timer);
  }, [seconds]);

  if (!current) return null;

  return (
    <div
      data-theme={exhibition.room_theme}
      className="relative flex h-dvh w-full cursor-none flex-col overflow-hidden bg-canvas text-ink portrait:justify-center"
      onClick={() => document.documentElement.requestFullscreen?.().catch(() => {})}
    >
      <AnimatePresence>
        <motion.div
          key={current.id + index}
          className="absolute inset-0 flex flex-col items-center justify-center gap-10 p-[5vmin] landscape:flex-row landscape:gap-[5vmin]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.4 }}
        >
          <div className="spotlight flex w-full flex-1 items-center justify-center self-stretch [container-type:inline-size] landscape:h-full">
            <ArtImage artwork={current} alt={current.image_alt ?? current.title} maxHeight="78dvh" sizes="80vw" priority />
          </div>
          <div className="flex w-full max-w-md flex-col gap-6 landscape:w-[24rem]">
            <Cartel artwork={current} size="lg" />
            <div className="flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/qr/${current.slug}?format=svg`} alt={t("qrAlt")} className="size-24 rounded-sm bg-white p-1.5" />
              <p className="text-sm text-ink-soft">{t("continueOnPhone")}</p>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Précharge l'œuvre suivante pour un fondu sans attente. */}
      {next && (
        <div className="pointer-events-none absolute size-px overflow-hidden opacity-0" aria-hidden="true">
          <ArtImage artwork={next} alt="" maxHeight="1px" sizes="80vw" />
        </div>
      )}

      <div className="absolute inset-x-[5vmin] bottom-[3vmin] flex items-center justify-between">
        <Logo />
        <p className="label-caps text-ink-muted">{localized(locale, exhibition.title, exhibition.title_en)}</p>
      </div>
    </div>
  );
}
