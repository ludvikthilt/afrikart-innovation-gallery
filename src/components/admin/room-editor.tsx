"use client";

import Image from "next/image";
import { useState, useTransition, type DragEvent } from "react";
import { useTranslations } from "next-intl";
import { saveRoomLayout } from "@/actions/admin";
import { useRouter } from "@/i18n/navigation";
import type { WallSide } from "@/types/database";

export type EditorArtwork = { id: string; title: string; artist: string; thumb: string; ratio: number; color: string | null };

type Props = {
  exhibitionId: string;
  roomId: string;
  theme: "dark" | "museum";
  artworks: EditorArtwork[];
  initial: Record<WallSide, string[]>;
};

const WALLS: WallSide[] = ["north", "east", "south", "west"];
type Target = WallSide | "pool";

/**
 * Salle « dépliée » : 4 murs côte à côte. On glisse les œuvres validées sur
 * un mur, ou on sélectionne une œuvre puis « Placer ici » (tactile, clavier).
 */
export function RoomEditor({ exhibitionId, roomId, theme, artworks, initial }: Props) {
  const t = useTranslations("admin");
  const router = useRouter();
  const byId = new Map(artworks.map((a) => [a.id, a]));
  const placed = new Set(WALLS.flatMap((w) => initial[w]));
  const [walls, setWalls] = useState(initial);
  const [pool, setPool] = useState(artworks.filter((a) => !placed.has(a.id)).map((a) => a.id));
  const [selected, setSelected] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState<"ok" | "error" | null>(null);
  const [pending, startTransition] = useTransition();

  const move = (id: string, target: Target, index?: number) => {
    const strip = (list: string[]) => list.filter((x) => x !== id);
    const nextWalls = Object.fromEntries(WALLS.map((w) => [w, strip(walls[w])])) as Record<WallSide, string[]>;
    let nextPool = strip(pool);
    if (target === "pool") nextPool = [...nextPool, id];
    else {
      const list = [...nextWalls[target]];
      list.splice(index ?? list.length, 0, id);
      nextWalls[target] = list;
    }
    setWalls(nextWalls);
    setPool(nextPool);
    setSelected(null);
    setDirty(true);
    setSaved(null);
  };

  const shift = (wall: WallSide, id: string, delta: number) => {
    const list = [...walls[wall]];
    const i = list.indexOf(id);
    const j = i + delta;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    setWalls({ ...walls, [wall]: list });
    setDirty(true);
  };

  const onDrop = (target: Target) => (e: DragEvent) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (byId.has(id)) move(id, target);
  };

  const save = () =>
    startTransition(async () => {
      const placements = [
        ...WALLS.flatMap((wall) => walls[wall].map((artworkId, i) => ({ artworkId, wall, position: i + 1 }))),
        ...pool.map((artworkId) => ({ artworkId, wall: null, position: 0 })),
      ];
      const result = await saveRoomLayout({ exhibitionId, roomId, placements });
      setSaved(result.ok ? "ok" : "error");
      if (result.ok) {
        setDirty(false);
        router.refresh();
      }
    });

  const chip = (id: string, wall?: WallSide) => {
    const a = byId.get(id)!;
    return (
      <div
        draggable
        onDragStart={(e) => e.dataTransfer.setData("text/plain", id)}
        className={`group relative flex shrink-0 flex-col items-center gap-1 ${selected === id ? "outline outline-2 outline-offset-4 outline-accent" : ""}`}
      >
        <button
          type="button"
          onClick={() => setSelected(selected === id ? null : id)}
          aria-pressed={selected === id}
          aria-label={`${a.title} — ${a.artist}`}
          className="relative block cursor-grab shadow-frame active:cursor-grabbing"
          style={{ height: wall ? 84 : 64, aspectRatio: `${a.ratio}`, backgroundColor: a.color ?? "#333" }}
        >
          <Image src={a.thumb} alt="" fill sizes="120px" className="object-cover" />
        </button>
        {wall && (
          <span className="flex gap-1 opacity-70 group-hover:opacity-100">
            <button type="button" onClick={() => shift(wall, id, -1)} aria-label={t("moveLeft")} className="px-1 text-xs">
              ◀
            </button>
            <button type="button" onClick={() => move(id, "pool")} aria-label={t("unhang")} className="px-1 text-xs text-danger">
              ×
            </button>
            <button type="button" onClick={() => shift(wall, id, 1)} aria-label={t("moveRight")} className="px-1 text-xs">
              ▶
            </button>
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="sticky top-16 z-10 flex flex-wrap items-center gap-4 border-b border-hairline-soft bg-canvas/95 py-3 backdrop-blur">
        <button type="button" onClick={save} disabled={!dirty || pending} className="btn btn-primary">
          {t("saveLayout")}
        </button>
        <p role="status" className="text-sm">
          {saved === "ok" && <span className="text-status-available">{t("layoutSaved")}</span>}
          {saved === "error" && <span className="text-danger">{t("layoutError")}</span>}
          {dirty && !saved && <span className="text-ink-muted">{t("unsaved")}</span>}
        </p>
        <p className="ml-auto text-sm text-ink-muted">{selected ? t("placeHint") : t("dragHint")}</p>
      </div>

      <section
        aria-label={t("pool")}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop("pool")}
        className="flex flex-col gap-3 rounded-sm border border-dashed border-hairline p-4"
      >
        <h2 className="label-caps text-ink-soft">
          {t("pool")} ({pool.length})
        </h2>
        <div className="flex min-h-20 flex-wrap items-end gap-4">
          {pool.length === 0 && <p className="text-sm text-ink-muted">{t("poolEmpty")}</p>}
          {pool.map((id) => (
            <div key={id} className="flex flex-col items-center gap-1">
              {chip(id)}
              <span className="max-w-24 truncate text-xs text-ink-muted">{byId.get(id)?.title}</span>
            </div>
          ))}
        </div>
      </section>

      <div data-theme={theme} className="grid gap-4 xl:grid-cols-2">
        {WALLS.map((wall) => (
          <section
            key={wall}
            aria-label={t(`wall.${wall}`)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop(wall)}
            className="flex flex-col gap-2"
          >
            <div className="flex items-center justify-between">
              <h3 className="label-caps text-ink-soft">{t(`wall.${wall}`)}</h3>
              {selected && (
                <button type="button" onClick={() => move(selected, wall)} className="label-caps text-accent hover:underline">
                  {t("placeHere")}
                </button>
              )}
            </div>
            <div className="relative flex aspect-[3/1] items-center justify-center gap-6 overflow-x-auto rounded-sm border border-hairline-soft bg-canvas px-6">
              <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-full bg-[radial-gradient(ellipse_at_50%_0%,var(--spotlight),transparent_70%)]" />
              <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-[15%] bg-black/10" />
              {walls[wall].length === 0 && <span className="relative text-sm text-ink-muted">{t("dropHere")}</span>}
              {walls[wall].map((id) => (
                <div key={id}>{chip(id, wall)}</div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
