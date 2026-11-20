"use client";

import { useSyncExternalStore } from "react";

/**
 * Mode de visite : « 3d » (salle R3F) ou « light » (2.5D).
 * Choix manuel mémorisé dans localStorage ; à défaut, détection de l'appareil.
 */
export type VisitMode = "3d" | "light";

const STORAGE_KEY = "afk:visit-mode";
const listeners = new Set<() => void>();
let detected: VisitMode | null = null;

type NavigatorHints = Navigator & {
  deviceMemory?: number;
  connection?: { saveData?: boolean; effectiveType?: string };
};

export function detectVisitMode(): VisitMode {
  if (detected) return detected;
  const nav = navigator as NavigatorHints;
  const capable =
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
    !nav.connection?.saveData &&
    !/(^|-)(2g|3g)$/.test(nav.connection?.effectiveType ?? "") &&
    (nav.deviceMemory ?? 8) >= 4 &&
    (nav.hardwareConcurrency ?? 8) >= 4 &&
    hasWebGL2();
  detected = capable ? "3d" : "light";
  return detected;
}

function hasWebGL2(): boolean {
  try {
    return Boolean(document.createElement("canvas").getContext("webgl2"));
  } catch {
    return false;
  }
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Navigation privée : le choix ne sera simplement pas mémorisé.
  }
}

function snapshot(): string {
  const stored = read(STORAGE_KEY);
  return stored === "3d" || stored === "light" ? stored : detectVisitMode();
}

const emit = () => listeners.forEach((l) => l());

/**
 * `mode` vaut « pending » au rendu serveur et pendant l'hydratation : on
 * n'affiche aucune salle avant de connaître le mode, pour éviter un aller-retour
 * 3D → léger → 3D à l'écran. Le mode ne change ensuite que sur action du visiteur.
 */
export function useVisitMode() {
  const mode = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    snapshot,
    () => "pending",
  ) as VisitMode | "pending";

  return {
    mode,
    setMode(next: VisitMode) {
      write(STORAGE_KEY, next);
      emit();
    },
  };
}
