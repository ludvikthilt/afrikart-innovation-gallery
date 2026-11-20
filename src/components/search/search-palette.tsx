"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { SearchIcon } from "@/components/ui/icons";
import { useRouter } from "@/i18n/navigation";
import { publicImageUrl } from "@/lib/images";
import { groupResults, searchResultHref } from "@/lib/search";
import type { SearchResult } from "@/types/database";

/** Palette de recherche ouvrable partout (Ctrl/⌘ K ou la loupe). */
export function SearchPalette() {
  const t = useTranslations("search");
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);

  const open = () => {
    dialog.current?.showModal();
    input.current?.select();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (dialog.current?.open) dialog.current.close();
        else open();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Recherche instantanée (avec un léger délai pour ne pas surcharger le réseau).
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        setResults(res.ok ? await res.json() : []);
        setActive(0);
      } catch {
        // requête annulée
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const searching = query.trim().length >= 2;
  const groups = useMemo(() => groupResults(searching ? results : []), [searching, results]);
  const ordered = [...groups.artist, ...groups.artwork, ...groups.collection];

  const go = (r: SearchResult) => {
    dialog.current?.close();
    router.push(searchResultHref(r));
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") setActive((i) => Math.min(i + 1, ordered.length - 1));
    else if (e.key === "ArrowUp") setActive((i) => Math.max(i - 1, 0));
    else if (e.key === "Enter" && ordered[active]) go(ordered[active]);
    else return;
    e.preventDefault();
  };

  const sections = [
    { key: "artist", label: t("artists"), items: groups.artist },
    { key: "artwork", label: t("artworks"), items: groups.artwork },
    { key: "collection", label: t("collections"), items: groups.collection },
  ] as const;

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-label={t("open")}
        aria-keyshortcuts="Control+K Meta+K"
        className="flex h-9 items-center gap-2 rounded-sm border border-hairline-soft px-2.5 text-ink-soft transition-colors hover:text-ink"
      >
        <SearchIcon size={16} />
        <span className="label-caps hidden lg:inline">{t("label")}</span>
        <kbd className="hidden rounded-xs border border-hairline-soft px-1 font-label text-[0.625rem] lg:inline">Ctrl K</kbd>
      </button>

      <dialog
        ref={dialog}
        aria-label={t("label")}
        onClick={(e) => e.target === dialog.current && dialog.current?.close()}
        className="mx-auto mt-[12vh] w-[min(680px,94vw)] rounded-sm border border-hairline bg-surface p-0 text-ink shadow-2xl backdrop:bg-black/40 backdrop:backdrop-blur-sm"
      >
        <div className="flex items-center gap-3 border-b border-hairline-soft px-4">
          <SearchIcon size={20} className="text-ink-muted" />
          <input
            ref={input}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={t("placeholder")}
            aria-label={t("placeholder")}
            role="combobox"
            aria-expanded={ordered.length > 0}
            aria-controls="search-results"
            aria-activedescendant={ordered[active] ? `sr-${ordered[active].kind}-${ordered[active].id}` : undefined}
            className="h-14 flex-1 bg-transparent text-lg outline-none placeholder:text-ink-muted"
          />
        </div>

        <div id="search-results" role="listbox" aria-label={t("results")} className="max-h-[55vh] overflow-y-auto py-2">
          {query.trim().length >= 2 && !loading && ordered.length === 0 && (
            <p className="px-5 py-6 text-center text-ink-soft">{t("empty")}</p>
          )}
          {sections.map(
            (section) =>
              section.items.length > 0 && (
                <div key={section.key} role="group" aria-label={section.label} className="py-1">
                  <p className="label-caps px-5 py-2 text-ink-muted">{section.label}</p>
                  {section.items.map((r) => {
                    const index = ordered.indexOf(r);
                    const image = publicImageUrl(r.image_path, r.kind === "artist" ? "avatars" : "artworks");
                    return (
                      <button
                        key={r.id}
                        id={`sr-${r.kind}-${r.id}`}
                        type="button"
                        role="option"
                        aria-selected={index === active}
                        onMouseEnter={() => setActive(index)}
                        onClick={() => go(r)}
                        className={`flex w-full items-center gap-3 px-5 py-2.5 text-left ${index === active ? "bg-white/5" : ""}`}
                      >
                        <span className={`relative size-10 shrink-0 overflow-hidden bg-surface-raised ${r.kind === "artist" ? "rounded-full" : ""}`}>
                          {image ? (
                            <Image src={image} alt="" fill sizes="40px" className="object-cover" />
                          ) : (
                            <span className="flex size-full items-center justify-center font-serif">{r.title.slice(0, 1)}</span>
                          )}
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className={`truncate ${r.kind === "artwork" ? "font-serif italic" : ""}`}>{r.title}</span>
                          {r.subtitle && <span className="truncate text-sm text-ink-muted">{r.subtitle}</span>}
                        </span>
                        {r.room_position !== null && (
                          <span className="label-caps shrink-0 rounded-xs border border-accent/40 px-2 py-1 text-accent">
                            {t("inRoom", { room: r.room_position })}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ),
          )}
        </div>

        <p className="hidden border-t border-hairline-soft px-5 py-2.5 font-label text-xs tracking-wide text-ink-muted sm:block">
          {t("keys")}
        </p>
      </dialog>
    </>
  );
}
