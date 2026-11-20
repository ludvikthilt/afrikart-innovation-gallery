"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArtImage } from "@/components/gallery/art-image";
import { Cartel } from "@/components/gallery/cartel";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { localized } from "@/lib/format";
import { useWide } from "@/lib/visit/use-media";
import type { VisitArtwork } from "@/lib/visit/types";

type Tab = { key: string; label: string; artworks: VisitArtwork[] };

/**
 * Un mur d'œuvres navigable (flèches, clavier, glisser), sans défilement :
 * 3 œuvres à la fois sur grand écran, une seule sur mobile.
 */
export function ArtworkWall({ tabs, emptyLabel }: { tabs: Tab[]; emptyLabel: string }) {
  const t = useTranslations("visit");
  const locale = useLocale() as Locale;
  const wide = useWide();
  const [tabKey, setTabKey] = useState(tabs[0]?.key);
  const [page, setPage] = useState(0);
  const [touch, setTouch] = useState<number | null>(null);

  const tab = tabs.find((x) => x.key === tabKey) ?? tabs[0];
  const perPage = wide ? 3 : 1;
  const pages = Math.max(1, Math.ceil((tab?.artworks.length ?? 0) / perPage));
  const current = Math.min(page, pages - 1);
  const visible = tab?.artworks.slice(current * perPage, current * perPage + perPage) ?? [];
  const move = (delta: number) => setPage(Math.min(Math.max(current + delta, 0), pages - 1));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, textarea, select") || document.querySelector("dialog[open]")) return;
      if (e.key === "ArrowRight") setPage((p) => Math.min(p + 1, pages - 1));
      if (e.key === "ArrowLeft") setPage((p) => Math.max(p - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pages]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      {tabs.length > 1 && (
        <div role="tablist" className="flex flex-wrap gap-x-6 gap-y-2 border-b border-hairline-soft">
          {tabs.map((x) => (
            <button
              key={x.key}
              role="tab"
              type="button"
              aria-selected={x.key === tab?.key}
              onClick={() => {
                setTabKey(x.key);
                setPage(0);
              }}
              className={`label-caps -mb-px border-b py-3 transition-colors ${x.key === tab?.key ? "border-accent text-ink" : "border-transparent text-ink-muted hover:text-ink"}`}
            >
              {x.label} <span className="text-ink-muted">({x.artworks.length})</span>
            </button>
          ))}
        </div>
      )}

      <div
        role="tabpanel"
        className="relative flex min-h-[60dvh] flex-1 items-center"
        onTouchStart={(e) => setTouch(e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touch === null) return;
          const dx = e.changedTouches[0].clientX - touch;
          if (Math.abs(dx) > 50) move(dx < 0 ? 1 : -1);
          setTouch(null);
        }}
      >
        {visible.length === 0 ? (
          <p className="w-full text-center text-ink-soft">{emptyLabel}</p>
        ) : (
          <ul className="flex w-full items-end justify-center gap-8 px-10 sm:px-16">
            {visible.map((a) => (
              <li key={a.id} className="flex min-w-0 flex-1 flex-col items-center gap-4 [container-type:inline-size]" style={{ maxWidth: wide ? "33%" : "100%" }}>
                <Link href={`/oeuvres/${a.slug}`} className="spotlight flex w-full justify-center pt-8">
                  <ArtImage artwork={a} alt={a.image_alt ?? localized(locale, a.title, a.title_en)} maxHeight="min(48dvh, 480px)" sizes="(min-width: 768px) 25vw, 80vw" />
                </Link>
                <div className="w-full max-w-xs">
                  <Cartel artwork={a} />
                </div>
              </li>
            ))}
          </ul>
        )}
        {pages > 1 && (
          <>
            <WallArrow side="left" label={t("prevArtwork")} disabled={current === 0} onClick={() => move(-1)} />
            <WallArrow side="right" label={t("nextArtwork")} disabled={current >= pages - 1} onClick={() => move(1)} />
          </>
        )}
      </div>
      {pages > 1 && (
        <p className="label-caps text-center text-ink-muted" aria-live="polite">
          {current + 1} / {pages}
        </p>
      )}
    </div>
  );
}

function WallArrow({ side, label, disabled, onClick }: { side: "left" | "right"; label: string; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`absolute top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/5 text-ink-soft hover:bg-white/10 hover:text-ink disabled:opacity-0 ${side === "left" ? "left-0" : "right-0"}`}
    >
      {side === "left" ? <ChevronLeftIcon size={22} /> : <ChevronRightIcon size={22} />}
    </button>
  );
}
