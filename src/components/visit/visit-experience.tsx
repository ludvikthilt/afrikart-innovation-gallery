"use client";

import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type PointerEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArtworkPanel } from "@/components/artwork/artwork-panel";
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon, MapIcon, ZoomIcon } from "@/components/ui/icons";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { localized } from "@/lib/format";
import { itinerary, positionToQuery, progress, visitReducer, type VisitAction, type VisitPosition } from "@/lib/visit/navigation";
import type { ArtworkStats, Rates, Viewer, VisitExhibition } from "@/lib/visit/types";
import { useReducedMotion, useWide } from "@/lib/visit/use-media";
import { useVisitMode } from "@/lib/visit/visit-mode";
import { GalleryPlan } from "./gallery-plan";
import { LightRoom } from "./light-room";
import { ZoomViewer } from "./zoom-viewer";

// Le JS 3D (three, R3F) n'est téléchargé que si la visite 3D est choisie.
const ThreeRoom = dynamic(() => import("./three-room"), { ssr: false });

type Props = {
  exhibition: VisitExhibition;
  initial: VisitPosition;
  stats: Record<string, ArtworkStats>;
  rates: Rates | null;
  viewer: Viewer;
};

type State = { pos: VisitPosition; dir: number };

const order = (p: VisitPosition) => p.room * 1e6 + p.wall * 1e3 + p.spot;

export function VisitExperience({ exhibition, initial, stats, rates, viewer }: Props) {
  const t = useTranslations("visit");
  const locale = useLocale() as Locale;
  const wide = useWide();
  const reducedMotion = useReducedMotion();
  const { mode, setMode } = useVisitMode();
  const [slow, setSlow] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [zoomOpen, setZoomOpen] = useState(false);

  const [{ pos, dir }, dispatch] = useReducer(
    (s: State, a: VisitAction): State => {
      const next = visitReducer(exhibition, s.pos, a);
      return next === s.pos ? s : { pos: next, dir: Math.sign(order(next) - order(s.pos)) || s.dir };
    },
    { pos: initial, dir: 1 },
  );

  const room = exhibition.rooms[pos.room];
  const wall = room?.walls[pos.wall];
  const focused = useMemo(
    () => (pos.focus ? itinerary(exhibition).find((s) => s.slug === pos.focus) : undefined),
    [exhibition, pos.focus],
  );
  const focusedArtwork = focused ? exhibition.rooms[focused.room].walls[focused.wall].artworks[focused.spot] : null;
  const { index, total } = progress(exhibition, pos);

  // L'URL suit la position : un lien partagé rouvre la même œuvre au même endroit.
  const qs = new URLSearchParams(positionToQuery(pos)).toString();
  const path = `/visite/${exhibition.slug}?${qs}`;
  useEffect(() => {
    window.history.replaceState(window.history.state, "", `${window.location.pathname}?${qs}`);
  }, [qs]);

  const step = useCallback(
    (forward: boolean) => {
      if (pos.focus) dispatch({ type: forward ? "nextArtwork" : "prevArtwork" });
      else if (wide) dispatch({ type: forward ? "nextWall" : "prevWall" });
      else dispatch({ type: forward ? "nextSpot" : "prevSpot" });
    },
    [pos.focus, wide],
  );

  // Clavier : ← → se déplacer, Échap fermer, P plan, 1-9 salles.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("input, textarea, select, [contenteditable]") || e.metaKey || e.ctrlKey || e.altKey) return;
      if (document.querySelector("dialog[open]")) return;
      if (e.key === "ArrowRight") step(true);
      else if (e.key === "ArrowLeft") step(false);
      else if (e.key === "Escape") {
        if (zoomOpen) setZoomOpen(false);
        else dispatch({ type: "closeFocus" });
      } else if (e.key.toLowerCase() === "p") setPlanOpen(true);
      else if (/^[1-9]$/.test(e.key) && !pos.focus) dispatch({ type: "goRoom", room: Number(e.key) - 1 });
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, zoomOpen, pos.focus]);

  // Glisser (swipe) horizontal.
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const onPointerDown = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") swipe.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e: PointerEvent) => {
    const start = swipe.current;
    swipe.current = null;
    if (!start) return;
    const dx = e.clientX - start.x;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(e.clientY - start.y) * 1.5) step(dx < 0);
  };

  if (!room || !wall) return null;

  const roomName = localized(locale, room.name, room.name_en);
  const announce = focusedArtwork
    ? t("announceArtwork", {
        title: localized(locale, focusedArtwork.title, focusedArtwork.title_en),
        artist: focusedArtwork.artist.display_name,
        index,
        total,
      })
    : t("announceWall", { room: pos.room + 1, name: roomName, wall: pos.wall + 1, walls: room.walls.length });

  const atStart = index <= 1 && pos.wall === 0 && pos.room === 0;
  const atEnd = pos.focus ? index >= total : pos.room === exhibition.rooms.length - 1 && pos.wall === room.walls.length - 1 && (wide || pos.spot === wall.artworks.length - 1);

  return (
    <div
      data-theme={exhibition.room_theme}
      className="relative flex h-[calc(100svh-4rem)] w-full flex-col overflow-clip bg-canvas text-ink select-none"
    >
      <h1 className="sr-only">{localized(locale, exhibition.title, exhibition.title_en)}</h1>
      <p aria-live="polite" aria-atomic="true" className="sr-only">
        {announce}
      </p>

      {/* Scène : la salle, les flèches. La barre d'informations est en dessous, jamais par-dessus l'œuvre. */}
      <div className="relative min-h-0 flex-1 touch-pan-y" onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
      {mode === "pending" ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="label-caps animate-pulse text-ink-muted">{t("entering")}</span>
        </div>
      ) : mode === "3d" ? (
        <ThreeRoom
          exhibition={exhibition}
          position={pos}
          reducedMotion={reducedMotion}
          onFocus={(slug) => dispatch({ type: "focus", slug })}
          onWall={(r, w) => dispatch({ type: "goWall", room: r, wall: w })}
          onSlow={() => setSlow(true)}
        />
      ) : (
        <LightRoom
          exhibition={exhibition}
          position={pos}
          direction={dir}
          wide={wide}
          reducedMotion={reducedMotion}
          onFocus={(slug) => dispatch({ type: "focus", slug })}
          onWall={(r, w) => dispatch({ type: "goWall", room: r, wall: w })}
        />
      )}

      {/* Flèches de déplacement */}
      {!pos.focus && (
        <>
          <EdgeArrow side="left" label={wide ? t("prevWall") : t("prevArtwork")} disabled={atStart} onClick={() => step(false)} />
          <EdgeArrow side="right" label={wide ? t("nextWall") : t("nextArtwork")} disabled={atEnd} onClick={() => step(true)} />
        </>
      )}

      {slow && mode === "3d" && !pos.focus && (
        <div role="status" className="absolute top-3 left-1/2 z-10 flex w-[min(92%,30rem)] -translate-x-1/2 items-center gap-3 rounded-sm border border-hairline bg-surface px-4 py-2.5 text-sm shadow-lg">
          <span className="flex-1 text-ink-soft">{t("slowHint")}</span>
          <button type="button" onClick={() => setMode("light")} className="label-caps text-accent hover:underline">
            {t("switchLight")}
          </button>
          <button type="button" onClick={() => setSlow(false)} aria-label={t("close")} className="text-ink-muted hover:text-ink">
            <CloseIcon size={16} />
          </button>
        </div>
      )}
      {!pos.focus && index === 1 && !slow && (
        <p className="pointer-events-none absolute top-4 left-1/2 hidden -translate-x-1/2 rounded-sm bg-surface/80 px-3 py-1 text-sm text-ink-soft backdrop-blur md:block">{t("hint")}</p>
      )}
      </div>

      {/* Barre basse : fil d'Ariane, progression, plan, mode */}
      {!pos.focus && (
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-hairline-soft bg-surface px-3 pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] sm:px-8">
          <nav aria-label={t("breadcrumb")} className="label-caps hidden min-w-0 truncate text-ink-muted md:block">
            <Link href="/" className="hover:text-ink">
              {localized(locale, exhibition.title, exhibition.title_en)}
            </Link>{" "}
            › {t("room", { number: pos.room + 1 })} — {roomName}
          </nav>
          <div className="flex min-w-0 items-center gap-3">
            <span className="label-caps truncate text-ink">
              {wide
                ? t("wallProgress", { room: pos.room + 1, wall: pos.wall + 1, walls: room.walls.length })
                : t("spotProgressShort", { room: pos.room + 1, index, total })}
            </span>
            <span className="flex gap-1.5" aria-hidden="true">
              {room.walls.map((w, i) => (
                <span key={w.side} className={`hidden h-1 rounded-full transition-all sm:block ${i === pos.wall ? "w-5 bg-accent" : "w-1.5 bg-ink-muted/50"}`} />
              ))}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {mode !== "pending" && <ModeToggle mode={mode} onChange={setMode} />}
            <button type="button" onClick={() => setPlanOpen(true)} className="btn btn-secondary min-h-10 px-3" aria-keyshortcuts="P" aria-label={t("plan")}>
              <MapIcon size={16} />
              <span className="hidden sm:inline">{t("plan")}</span>
            </button>
          </div>
        </div>
      )}


      {/* Focus : œuvre de près + panneau d'information */}
      <AnimatePresence>
        {focusedArtwork && (
          <motion.div
            key="focus"
            className="absolute inset-0 z-20 flex flex-col md:flex-row"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0.15 : 0.35, delay: reducedMotion ? 0 : 0.25 }}
          >
            <div className="relative h-[45%] w-full md:h-full md:w-[62%]">
              {mode !== "3d" || zoomOpen ? (
                <ZoomViewer key={focusedArtwork.id} artwork={focusedArtwork} alt={focusedArtwork.image_alt ?? localized(locale, focusedArtwork.title, focusedArtwork.title_en)} />
              ) : (
                <button
                  type="button"
                  onClick={() => setZoomOpen(true)}
                  className="btn btn-secondary absolute bottom-4 left-1/2 -translate-x-1/2 bg-overlay"
                >
                  <ZoomIcon size={16} />
                  {t("zoom")}
                </button>
              )}
            </div>

            <motion.aside
              aria-label={t("panel")}
              className="relative flex h-[55%] w-full flex-col border-t border-hairline bg-overlay backdrop-blur-2xl md:h-full md:w-[38%] md:border-t-0 md:border-l"
              initial={wide ? { x: "100%" } : { y: "100%" }}
              animate={{ x: 0, y: 0 }}
              exit={wide ? { x: "100%" } : { y: "100%" }}
              transition={{ duration: reducedMotion ? 0.15 : 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-ink-muted/50 md:hidden" aria-hidden="true" />
              <button
                type="button"
                autoFocus
                onClick={() => {
                  setZoomOpen(false);
                  dispatch({ type: "closeFocus" });
                }}
                aria-label={t("closeFocus")}
                className="absolute top-3 right-3 z-10 flex size-11 items-center justify-center rounded-sm text-ink-soft hover:text-ink"
              >
                <CloseIcon />
              </button>
              <div className="flex-1 overflow-y-auto overscroll-contain px-5 pt-6 pb-6 sm:px-8">
                <ArtworkPanel
                  key={focusedArtwork.id}
                  artwork={focusedArtwork}
                  stats={stats[focusedArtwork.id] ?? { likes: 0, comments: 0, liked: false }}
                  rates={rates}
                  viewer={viewer}
                  returnPath={path}
                  eyebrow={t("artworkEyebrow", { room: pos.room + 1, index, total })}
                />
              </div>
              <div className="flex items-center justify-between border-t border-hairline-soft px-3 py-2">
                <button type="button" onClick={() => dispatch({ type: "prevArtwork" })} disabled={index <= 1} className="btn btn-ghost min-h-10 disabled:opacity-30">
                  <ChevronLeftIcon size={16} />
                  {t("prevArtwork")}
                </button>
                <button type="button" onClick={() => dispatch({ type: "nextArtwork" })} disabled={index >= total} className="btn btn-ghost min-h-10 disabled:opacity-30">
                  {t("nextArtwork")}
                  <ChevronRightIcon size={16} />
                </button>
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      <GalleryPlan
        open={planOpen}
        onClose={() => setPlanOpen(false)}
        exhibition={exhibition}
        position={pos}
        onRoom={(r) => {
          setPlanOpen(false);
          dispatch({ type: "goRoom", room: r });
        }}
        onArtwork={(slug) => {
          setPlanOpen(false);
          dispatch({ type: "focus", slug });
        }}
      />
    </div>
  );
}

function EdgeArrow({ side, label, disabled, onClick }: { side: "left" | "right"; label: string; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`absolute top-1/2 z-10 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-hairline-soft bg-surface/85 text-ink shadow-md backdrop-blur transition hover:border-accent hover:text-accent disabled:pointer-events-none disabled:opacity-0 sm:size-14 ${
        side === "left" ? "left-2 sm:left-6" : "right-2 sm:right-6"
      }`}
    >
      {side === "left" ? <ChevronLeftIcon size={24} /> : <ChevronRightIcon size={24} />}
    </button>
  );
}

function ModeToggle({ mode, onChange }: { mode: "3d" | "light"; onChange: (m: "3d" | "light") => void }) {
  const t = useTranslations("nav");
  return (
    <div role="radiogroup" aria-label={t("visitMode")} className="flex rounded-sm border border-hairline p-0.5">
      {(["3d", "light"] as const).map((m) => (
        <button
          key={m}
          type="button"
          role="radio"
          aria-checked={mode === m}
          onClick={() => onChange(m)}
          className={`label-caps min-h-9 rounded-xs px-2.5 transition-colors ${mode === m ? "bg-ink text-canvas" : "text-ink-muted hover:text-ink"}`}
        >
          <span className="sm:hidden">{m === "3d" ? "3D" : t("visitLightShort")}</span>
          <span className="hidden sm:inline">{m === "3d" ? t("visit3d") : t("visitLight")}</span>
        </button>
      ))}
    </div>
  );
}
