"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CloseIcon } from "@/components/ui/icons";
import type { Locale } from "@/i18n/routing";
import { localized } from "@/lib/format";
import { artworkImageUrl } from "@/lib/images";
import type { VisitPosition } from "@/lib/visit/navigation";
import type { VisitExhibition, VisitWall } from "@/lib/visit/types";
import type { WallSide } from "@/types/database";

type Props = {
  open: boolean;
  onClose: () => void;
  exhibition: VisitExhibition;
  position: VisitPosition;
  onRoom: (room: number) => void;
  onArtwork: (slug: string) => void;
};

const SIDE_CLASS: Record<WallSide, string> = {
  north: "top-2 inset-x-8 flex-row justify-center",
  south: "bottom-2 inset-x-8 flex-row justify-center",
  west: "left-2 inset-y-8 flex-col justify-center",
  east: "right-2 inset-y-8 flex-col justify-center",
};

/** Plan d'architecte vu de dessus : un clic sur une miniature y conduit. */
export function GalleryPlan({ open, onClose, exhibition, position, onRoom, onArtwork }: Props) {
  const t = useTranslations("visit");
  const locale = useLocale() as Locale;
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby="plan-title"
      className="m-auto max-h-[90dvh] w-[min(1100px,94vw)] overflow-auto rounded-sm border border-hairline bg-canvas p-0 text-ink backdrop:bg-black/40 backdrop:backdrop-blur-sm"
    >
      <div className="flex flex-col gap-6 p-5 sm:p-8">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="label-caps text-accent">{localized(locale, exhibition.title, exhibition.title_en)}</p>
            <h2 id="plan-title" className="mt-1 font-serif text-3xl">
              {t("plan")}
            </h2>
          </div>
          <button type="button" onClick={onClose} aria-label={t("close")} className="btn btn-ghost min-h-10 px-2">
            <CloseIcon />
          </button>
        </header>

        <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {exhibition.rooms.map((room, r) => {
            const here = r === position.room;
            return (
              <li
                key={room.id}
                className={`relative aspect-square border transition-colors ${here ? "border-accent" : "border-hairline hover:border-accent/60"}`}
              >
                <button
                  type="button"
                  onClick={() => onRoom(r)}
                  className="absolute inset-[22%] flex flex-col items-center justify-center gap-1 text-center"
                >
                  <span className="label-caps text-ink-muted">{t("room", { number: r + 1 })}</span>
                  <span className="font-serif text-lg italic leading-tight">{localized(locale, room.name, room.name_en)}</span>
                  {here && (
                    <span className="mt-2 flex items-center gap-1.5 font-label text-xs text-accent">
                      <span className="relative flex size-2">
                        <span className="absolute inset-0 animate-ping rounded-full bg-accent opacity-75 motion-reduce:hidden" />
                        <span className="relative size-2 rounded-full bg-accent" />
                      </span>
                      {t("youAreHere")}
                    </span>
                  )}
                </button>
                {room.walls.map((wall) => (
                  <WallThumbs key={wall.side} wall={wall} activeSlug={here ? position.focus : null} onArtwork={onArtwork} />
                ))}
              </li>
            );
          })}
        </ol>
        <p className="text-center text-sm text-ink-muted">{t("planHint")}</p>
      </div>
    </dialog>
  );
}

function WallThumbs({ wall, activeSlug, onArtwork }: { wall: VisitWall; activeSlug: string | null; onArtwork: (slug: string) => void }) {
  const locale = useLocale() as Locale;
  return (
    <div className={`absolute flex gap-1.5 ${SIDE_CLASS[wall.side]}`}>
      {wall.artworks.map((a) => (
        <button
          key={a.id}
          type="button"
          onClick={() => onArtwork(a.slug)}
          title={localized(locale, a.title, a.title_en)}
          aria-label={`${localized(locale, a.title, a.title_en)} — ${a.artist.display_name}`}
          className={`relative size-9 overflow-hidden border sm:size-10 ${a.slug === activeSlug ? "border-accent" : "border-hairline-soft hover:border-accent"}`}
          style={{ backgroundColor: a.dominant_color ?? "#222" }}
        >
          <Image src={artworkImageUrl(a, "thumb")} alt="" fill sizes="40px" className="object-cover" />
        </button>
      ))}
    </div>
  );
}
