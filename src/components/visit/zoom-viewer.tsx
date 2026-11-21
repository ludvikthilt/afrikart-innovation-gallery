"use client";

import Image from "next/image";
import { useRef, useState, type PointerEvent, type WheelEvent } from "react";
import { useTranslations } from "next-intl";
import { artworkImageUrl } from "@/lib/images";
import type { VisitArtwork } from "@/lib/visit/types";

type View = { scale: number; x: number; y: number };
const MIN = 1;
const MAX = 6;
const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

/**
 * Zoom haute définition sans quitter la salle : molette, pincement, glisser,
 * double-clic. La pleine résolution n'est chargée qu'une fois zoomé.
 */
export function ZoomViewer({ artwork, alt }: { artwork: VisitArtwork; alt: string }) {
  const t = useTranslations("visit");
  const box = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; scale: number } | null>(null);
  const [view, setView] = useState<View>({ scale: 1, x: 0, y: 0 });
  const [hiRes, setHiRes] = useState(false);

  const apply = (next: View) => {
    const scale = clamp(next.scale, MIN, MAX);
    const rect = box.current?.getBoundingClientRect();
    const maxX = rect ? (rect.width * (scale - 1)) / 2 : 0;
    const maxY = rect ? (rect.height * (scale - 1)) / 2 : 0;
    if (scale > 1.4) setHiRes(true);
    setView({ scale, x: clamp(next.x, -maxX, maxX), y: clamp(next.y, -maxY, maxY) });
  };

  // Zoom vers le point visé (curseur ou centre).
  const zoomAt = (factor: number, clientX?: number, clientY?: number) => {
    const rect = box.current?.getBoundingClientRect();
    const scale = clamp(view.scale * factor, MIN, MAX);
    if (!rect || clientX === undefined || clientY === undefined) return apply({ ...view, scale });
    const cx = clientX - rect.left - rect.width / 2;
    const cy = clientY - rect.top - rect.height / 2;
    const k = scale / view.scale;
    apply({ scale, x: cx - (cx - view.x) * k, y: cy - (cy - view.y) * k });
  };

  const onWheel = (e: WheelEvent) => zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX, e.clientY);

  const onPointerDown = (e: PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), scale: view.scale };
    }
  };

  const onPointerMove = (e: PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      apply({ ...view, scale: (pinch.current.scale * Math.hypot(a.x - b.x, a.y - b.y)) / pinch.current.dist });
    } else if (view.scale > 1) {
      apply({ ...view, x: view.x + e.clientX - prev.x, y: view.y + e.clientY - prev.y });
    }
  };

  const onPointerUp = (e: PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  };

  const fullscreen = () => {
    const el = box.current?.parentElement;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.();
  };

  const ratio = artwork.image_width / artwork.image_height;

  return (
    <div data-zoomable className="relative flex h-full w-full flex-col items-center justify-center bg-canvas p-3 sm:p-4 sm:pb-20 [container-type:size]">
      <div
        ref={box}
        className="relative touch-none overflow-hidden"
        style={{ aspectRatio: `${ratio}`, height: `min(100cqh - 1.5rem, calc((100cqw - 1.5rem) / ${ratio.toFixed(4)}))` }}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={(e) => (view.scale > 1 ? apply({ scale: 1, x: 0, y: 0 }) : zoomAt(2.5, e.clientX, e.clientY))}
      >
        <div
          className="absolute inset-0 shadow-frame"
          style={{
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
            backgroundColor: artwork.dominant_color ?? "#222",
            cursor: view.scale > 1 ? "grab" : "zoom-in",
          }}
        >
          <Image src={artworkImageUrl(artwork, "medium")} alt={alt} fill sizes="62vw" priority className="object-cover" draggable={false} />
          {hiRes && (
            <Image src={artworkImageUrl(artwork, "full")} alt="" fill sizes="100vw" unoptimized className="object-cover" draggable={false} />
          )}
        </div>
      </div>

      <div className="absolute right-2 bottom-2 flex items-center gap-0.5 rounded-sm border border-hairline bg-surface/90 p-0.5 shadow-sm backdrop-blur sm:right-auto sm:bottom-4 sm:left-1/2 sm:-translate-x-1/2 sm:gap-1 sm:p-1">
        <ZoomButton label={t("zoomIn")} onClick={() => zoomAt(1.5)}>+</ZoomButton>
        <ZoomButton label={t("zoomOut")} onClick={() => zoomAt(1 / 1.5)}>−</ZoomButton>
        <ZoomButton label={t("fullscreen")} onClick={fullscreen}>⤢</ZoomButton>
      </div>
    </div>
  );
}

function ZoomButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex size-9 items-center justify-center rounded-sm font-label text-lg text-ink-soft hover:bg-hairline-soft hover:text-ink sm:size-10"
    >
      {children}
    </button>
  );
}
