"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArtImage } from "@/components/gallery/art-image";
import { Cartel } from "@/components/gallery/cartel";
import { Logo } from "@/components/layout/logo";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { localized } from "@/lib/format";
import type { VisitArtwork, VisitExhibition } from "@/lib/visit/types";

type Filter = { kind: "all" } | { kind: "room"; index: number } | { kind: "artist"; id: string };
type Panel = "none" | "rooms" | "artists";

/**
 * Borne tactile du stand : gros éléments, aucun clavier, aucune action de
 * compte, retour automatique au début après une période d'inactivité.
 */
export function Kiosk({ exhibition, idleMinutes }: { exhibition: VisitExhibition; idleMinutes: number }) {
  const t = useTranslations("kiosk");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [filter, setFilter] = useState<Filter>({ kind: "all" });
  const [panel, setPanel] = useState<Panel>("none");
  const [index, setIndex] = useState(0);
  const touch = useRef<number | null>(null);

  const all = useMemo(
    () => exhibition.rooms.flatMap((r, room) => r.walls.flatMap((w) => w.artworks.map((a) => ({ ...a, room })))),
    [exhibition],
  );
  const artists = useMemo(() => {
    const seen = new Map<string, VisitArtwork["artist"]>();
    all.forEach((a) => seen.set(a.artist.id, a.artist));
    return [...seen.values()];
  }, [all]);
  const list = all.filter((a) =>
    filter.kind === "all" ? true : filter.kind === "room" ? a.room === filter.index : a.artist.id === filter.id,
  );
  const current = list[Math.min(index, list.length - 1)];
  const move = useCallback((d: number) => setIndex((i) => (i + d + list.length) % Math.max(1, list.length)), [list.length]);

  // Retour au début après inactivité.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        setFilter({ kind: "all" });
        setPanel("none");
        setIndex(0);
      }, idleMinutes * 60_000);
    };
    const events = ["pointerdown", "keydown"] as const;
    events.forEach((e) => window.addEventListener(e, reset));
    reset();
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [idleMinutes]);

  const choose = (f: Filter) => {
    setFilter(f);
    setIndex(0);
    setPanel("none");
  };

  return (
    <div
      data-theme={exhibition.room_theme}
      className="relative flex h-dvh w-full flex-col overflow-hidden bg-canvas text-ink select-none"
      onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touch.current === null) return;
        const dx = e.changedTouches[0].clientX - touch.current;
        if (Math.abs(dx) > 60) move(dx < 0 ? 1 : -1);
        touch.current = null;
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <header className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4 sm:px-10 sm:pt-8">
        <button type="button" onClick={() => document.documentElement.requestFullscreen?.().catch(() => {})} aria-label={t("fullscreen")}>
          <Logo />
        </button>
        <div className="order-last w-full text-left sm:order-none sm:w-auto sm:text-right">
          <p className="label-caps text-accent">{t("currentExhibition")}</p>
          <p className="font-serif text-2xl sm:text-3xl">{localized(locale, exhibition.title, exhibition.title_en)}</p>
        </div>
        <div className="flex gap-2">
          {(["fr", "en"] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => router.replace(pathname, { locale: l })}
              aria-pressed={locale === l}
              className={`label-caps min-h-11 min-w-12 rounded-sm border text-sm sm:min-h-14 sm:min-w-16 sm:text-base ${locale === l ? "border-accent text-accent" : "border-hairline-soft text-ink-soft"}`}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-14 sm:px-28 lg:px-36">
        <AnimatePresence mode="wait">
          {current && (
            <motion.div
              key={current.id}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.5 }}
              className="flex h-full w-full flex-col items-center justify-center gap-4 py-4 sm:gap-8 sm:py-6 lg:flex-row lg:gap-16"
            >
              <div className="spotlight flex min-h-0 w-full flex-1 items-center justify-center [container-type:inline-size] lg:h-full">
                <ArtImage artwork={current} alt={current.image_alt ?? current.title} maxHeight="min(56dvh, 640px)" sizes="60vw" priority />
              </div>
              <div className="flex w-full max-w-xl shrink-0 flex-col gap-6 lg:w-[26rem]">
                <Cartel artwork={current} size="lg" />
                {localized(locale, current.description, current.description_en) && (
                  <p className="hidden text-lg leading-8 font-light text-ink-soft sm:line-clamp-6">
                    {localized(locale, current.description, current.description_en)}
                  </p>
                )}
                <p className="label-caps text-ink-muted">
                  {index + 1} / {list.length}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <KioskArrow side="left" label={t("previous")} onClick={() => move(-1)} />
        <KioskArrow side="right" label={t("next")} onClick={() => move(1)} />
      </div>

      <footer className="flex flex-wrap items-end justify-between gap-4 px-4 pb-4 sm:gap-8 sm:px-10 sm:pb-8">
        <nav className="flex flex-wrap gap-2 sm:gap-4">
          <KioskButton active={filter.kind === "all"} onClick={() => choose({ kind: "all" })}>
            {t("allWorks")}
          </KioskButton>
          <KioskButton active={panel === "rooms" || filter.kind === "room"} onClick={() => setPanel(panel === "rooms" ? "none" : "rooms")}>
            {t("rooms")}
          </KioskButton>
          <KioskButton active={panel === "artists" || filter.kind === "artist"} onClick={() => setPanel(panel === "artists" ? "none" : "artists")}>
            {t("artists")}
          </KioskButton>
        </nav>
        {current && (
          <div className="hidden items-center gap-4 rounded-sm bg-white p-3 text-[#1c1c1e] md:flex">
            <p className="max-w-44 text-sm leading-snug">{t("continueOnPhone")}</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/qr/${current.slug}?format=svg`} alt={t("qrAlt")} className="size-28" />
          </div>
        )}
      </footer>

      {panel !== "none" && (
        <div className="absolute inset-x-4 bottom-28 max-h-[50dvh] overflow-y-auto rounded-sm border border-hairline bg-overlay p-4 backdrop-blur-xl sm:inset-x-10 sm:bottom-36 sm:p-6">
          <ul className="flex flex-wrap gap-4">
            {panel === "rooms"
              ? exhibition.rooms.map((r, i) => (
                  <li key={r.id}>
                    <KioskButton active={filter.kind === "room" && filter.index === i} onClick={() => choose({ kind: "room", index: i })}>
                      {t("room", { number: i + 1 })} — {localized(locale, r.name, r.name_en)}
                    </KioskButton>
                  </li>
                ))
              : artists.map((a) => (
                  <li key={a.id}>
                    <KioskButton active={filter.kind === "artist" && filter.id === a.id} onClick={() => choose({ kind: "artist", id: a.id })}>
                      {a.display_name}
                    </KioskButton>
                  </li>
                ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function KioskButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-12 rounded-sm border px-4 font-label text-sm tracking-wide uppercase transition-colors sm:min-h-16 sm:px-8 sm:text-lg ${
        active ? "border-accent bg-accent text-white" : "border-hairline text-ink hover:border-accent"
      }`}
    >
      {children}
    </button>
  );
}

function KioskArrow({ side, label, onClick }: { side: "left" | "right"; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`absolute top-1/2 flex size-12 -translate-y-1/2 items-center justify-center rounded-full border border-hairline-soft bg-surface/80 text-ink active:bg-surface sm:size-24 ${
        side === "left" ? "left-1 sm:left-8" : "right-1 sm:right-8"
      }`}
    >
      {side === "left" ? <ChevronLeftIcon className="size-6 sm:size-11" /> : <ChevronRightIcon className="size-6 sm:size-11" />}
    </button>
  );
}
