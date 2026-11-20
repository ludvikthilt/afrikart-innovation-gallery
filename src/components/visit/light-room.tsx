"use client";

import { AnimatePresence, motion, type Variants } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { ArtImage } from "@/components/gallery/art-image";
import { Cartel } from "@/components/gallery/cartel";
import type { Locale } from "@/i18n/routing";
import { localized } from "@/lib/format";
import type { VisitPosition } from "@/lib/visit/navigation";
import type { VisitArtwork, VisitExhibition, VisitWall } from "@/lib/visit/types";

type Props = {
  exhibition: VisitExhibition;
  position: VisitPosition;
  /** 1 = on avance, -1 = on recule (sens de la transition). */
  direction: number;
  wide: boolean;
  reducedMotion: boolean;
  onFocus: (slug: string) => void;
  onWall: (room: number, wall: number) => void;
};

const EASE = [0.22, 1, 0.36, 1] as const;

// La « caméra » tourne vers le mur suivant : l'ancien mur part en
// perspective d'un côté, le nouveau arrive de l'autre.
const turn: Variants = {
  enter: (dir: number) => ({ x: `${dir * 45}%`, rotateY: dir * -35, opacity: 0, scale: 0.92 }),
  center: { x: "0%", rotateY: 0, opacity: 1, scale: 1 },
  exit: (dir: number) => ({ x: `${dir * -45}%`, rotateY: dir * 35, opacity: 0, scale: 0.92 }),
};
const fade: Variants = { enter: { opacity: 0 }, center: { opacity: 1 }, exit: { opacity: 0 } };

/** Salle en 2.5D : un mur de face, les murs voisins en perspective sur les côtés. */
export function LightRoom({ exhibition, position, direction, wide, reducedMotion, onFocus, onWall }: Props) {
  const room = exhibition.rooms[position.room];
  const wall = room?.walls[position.wall];
  if (!room || !wall) return null;

  const neighbours = adjacentWalls(exhibition, position);
  const focused = position.focus !== null;

  return (
    <motion.div
      className="absolute inset-0 overflow-clip [container-type:size] [perspective:1600px]"
      animate={focused ? { scale: 1.12, opacity: 0.25, filter: "blur(6px)" } : { scale: 1, opacity: 1, filter: "blur(0px)" }}
      transition={{ duration: reducedMotion ? 0.2 : 0.75, ease: EASE }}
      aria-hidden={focused}
      inert={focused}
    >
      {/* Sol en perspective et lumière d'ambiance */}
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[22%] bg-[linear-gradient(to_bottom,transparent,rgb(0_0_0/0.35))]" />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-2/3 bg-[radial-gradient(ellipse_at_50%_0%,var(--spotlight),transparent_70%)]"
      />

      {wide && neighbours.prev && (
        <SideWall side="left" wall={neighbours.prev.wall} onClick={() => onWall(neighbours.prev!.room, neighbours.prev!.wall.index)} />
      )}
      {wide && neighbours.next && (
        <SideWall side="right" wall={neighbours.next.wall} onClick={() => onWall(neighbours.next!.room, neighbours.next!.wall.index)} />
      )}

      <AnimatePresence custom={direction} initial={false} mode="popLayout">
        <motion.div
          key={`${position.room}-${position.wall}`}
          custom={direction}
          variants={reducedMotion ? fade : turn}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: reducedMotion ? 0.25 : 0.8, ease: EASE }}
          className={`absolute inset-y-0 flex items-center justify-center ${wide ? "inset-x-[15%] gap-[4%]" : "inset-x-0"}`}
          style={{ transformStyle: "preserve-3d" }}
        >
          {wide ? (
            wall.artworks.map((artwork, i) => (
              <WallArtwork key={artwork.id} artwork={artwork} count={wall.artworks.length} priority={i < 2} onFocus={onFocus} />
            ))
          ) : (
            <MobileStrip artworks={wall.artworks} spot={position.spot} reducedMotion={reducedMotion} onFocus={onFocus} />
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

function WallArtwork({
  artwork,
  count,
  priority,
  onFocus,
}: {
  artwork: VisitArtwork;
  count: number;
  priority: boolean;
  onFocus: (slug: string) => void;
}) {
  const locale = useLocale() as Locale;
  const t = useTranslations("visit");
  const title = localized(locale, artwork.title, artwork.title_en);

  return (
    <figure
      className="flex min-w-0 flex-col items-center gap-5 [container-type:inline-size]"
      style={{ flex: `${artwork.image_width / artwork.image_height} 1 0`, maxWidth: count === 1 ? "60%" : undefined }}
    >
      <button
        type="button"
        onClick={() => onFocus(artwork.slug)}
        aria-label={t("lookCloser", { title })}
        className="spotlight flex w-full justify-center rounded-sm pt-10 pb-2 transition-transform duration-300 hover:scale-[1.015]"
      >
        <ArtImage
          artwork={artwork}
          alt={artwork.image_alt ?? title}
          maxHeight="min(100cqh - 13rem, 560px)"
          sizes="(min-width: 768px) 35vw, 80vw"
          priority={priority}
        />
      </button>
      <figcaption className="w-full max-w-xs">
        <Cartel artwork={artwork} />
      </figcaption>
    </figure>
  );
}

/** Mobile : une œuvre à la fois, les voisines dépassent pour inviter à glisser. */
function MobileStrip({
  artworks,
  spot,
  reducedMotion,
  onFocus,
}: {
  artworks: VisitArtwork[];
  spot: number;
  reducedMotion: boolean;
  onFocus: (slug: string) => void;
}) {
  const locale = useLocale() as Locale;
  const t = useTranslations("visit");
  const ITEM = 76; // largeur d'une œuvre en % de l'écran
  const GAP = 6;

  return (
    <motion.ul
      className="flex h-full w-full items-center"
      style={{ gap: `${GAP}vw`, paddingInline: `${(100 - ITEM) / 2}vw` }}
      animate={{ x: `${-spot * (ITEM + GAP)}vw` }}
      transition={{ duration: reducedMotion ? 0.2 : 0.6, ease: EASE }}
    >
      {artworks.map((artwork, i) => {
        const title = localized(locale, artwork.title, artwork.title_en);
        return (
          <li
            key={artwork.id}
            className="flex shrink-0 flex-col items-center gap-4 [container-type:inline-size]"
            style={{ width: `${ITEM}vw`, opacity: i === spot ? 1 : 0.35 }}
            aria-hidden={i !== spot}
          >
            <button
              type="button"
              tabIndex={i === spot ? 0 : -1}
              onClick={() => onFocus(artwork.slug)}
              aria-label={t("lookCloser", { title })}
              className="spotlight flex w-full justify-center pt-5"
            >
              <ArtImage artwork={artwork} alt={artwork.image_alt ?? title} maxHeight="calc(100cqh - 9.5rem)" sizes="80vw" priority={i === spot} />
            </button>
            <div className="w-full">
              <Cartel artwork={artwork} />
            </div>
          </li>
        );
      })}
    </motion.ul>
  );
}

function SideWall({
  side,
  wall,
  onClick,
}: {
  side: "left" | "right";
  wall: VisitWall & { index: number };
  onClick: () => void;
}) {
  const t = useTranslations("visit");
  return (
    <button
      type="button"
      onClick={onClick}
      tabIndex={-1}
      aria-label={side === "left" ? t("prevWall") : t("nextWall")}
      className={`absolute inset-y-[12%] flex w-[13%] items-center justify-center gap-3 opacity-50 blur-[1.5px] transition-opacity hover:opacity-80 ${
        side === "left" ? "left-0 origin-left" : "right-0 origin-right"
      }`}
      style={{ transform: `rotateY(${side === "left" ? 62 : -62}deg)`, transformStyle: "preserve-3d" }}
    >
      {wall.artworks.slice(0, 3).map((a) => (
        <span key={a.id} className="w-1/2 [container-type:inline-size]">
          <ArtImage artwork={a} size="thumb" maxHeight="30dvh" sizes="10vw" alt="" />
        </span>
      ))}
    </button>
  );
}

/** Murs voisins dans le parcours (y compris salle précédente / suivante). */
function adjacentWalls(exhibition: VisitExhibition, p: VisitPosition) {
  const all = exhibition.rooms.flatMap((r, room) => r.walls.map((w, index) => ({ room, wall: { ...w, index } })));
  const i = all.findIndex((w) => w.room === p.room && w.wall.index === p.wall);
  return { prev: all[i - 1], next: all[i + 1] };
}
