import type { SearchResult } from "@/types/database";

/**
 * Où mène un résultat : une œuvre exposée « téléporte » dans la salle,
 * sinon sa fiche ; un artiste vers son mur ; une collection vers sa page.
 */
export function searchResultHref(r: SearchResult): string {
  if (r.kind === "artist") return `/artistes/${r.slug}`;
  if (r.kind === "collection") return `/collections/${r.slug}`;
  if (r.exhibition_slug) return `/visite/${r.exhibition_slug}?oeuvre=${encodeURIComponent(r.slug)}`;
  return `/oeuvres/${r.slug}`;
}

export function groupResults(results: SearchResult[]) {
  return {
    artist: results.filter((r) => r.kind === "artist"),
    artwork: results.filter((r) => r.kind === "artwork"),
    collection: results.filter((r) => r.kind === "collection"),
  };
}
