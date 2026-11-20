/**
 * Où est le visiteur ? Source de vérité unique, partagée par la visite
 * légère (2.5D) et la visite 3D. Module pur : aucun accès au DOM.
 *
 *  room  : index de la salle
 *  wall  : index du mur (dans les murs non vides de la salle)
 *  spot  : index de l'œuvre sur ce mur (navigation œuvre par œuvre sur mobile)
 *  focus : slug de l'œuvre regardée de près, ou null
 */

export type VisitPosition = { room: number; wall: number; spot: number; focus: string | null };

export type VisitLayout = { rooms: { walls: { artworks: { slug: string }[] }[] }[] };

export type VisitAction =
  | { type: "nextWall" }
  | { type: "prevWall" }
  | { type: "nextSpot" }
  | { type: "prevSpot" }
  | { type: "goRoom"; room: number }
  | { type: "goWall"; room: number; wall: number }
  | { type: "focus"; slug: string }
  | { type: "nextArtwork" }
  | { type: "prevArtwork" }
  | { type: "closeFocus" };

type Stop = { room: number; wall: number; spot: number; slug: string };

export const START: VisitPosition = { room: 0, wall: 0, spot: 0, focus: null };

/** Toutes les œuvres dans l'ordre du parcours. */
export function itinerary(layout: VisitLayout): Stop[] {
  const stops: Stop[] = [];
  layout.rooms.forEach((r, room) =>
    r.walls.forEach((w, wall) => w.artworks.forEach((a, spot) => stops.push({ room, wall, spot, slug: a.slug }))),
  );
  return stops;
}

/** Tous les murs dans l'ordre du parcours. */
function walls(layout: VisitLayout): { room: number; wall: number }[] {
  return layout.rooms.flatMap((r, room) => r.walls.map((_, wall) => ({ room, wall })));
}

export function locate(layout: VisitLayout, slug: string): Stop | undefined {
  return itinerary(layout).find((s) => s.slug === slug);
}

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

function wallIndex(layout: VisitLayout, p: VisitPosition): number {
  return walls(layout).findIndex((w) => w.room === p.room && w.wall === p.wall);
}

function wallLength(layout: VisitLayout, room: number, wall: number): number {
  return layout.rooms[room]?.walls[wall]?.artworks.length ?? 0;
}

export function visitReducer(layout: VisitLayout, state: VisitPosition, action: VisitAction): VisitPosition {
  const allWalls = walls(layout);
  if (allWalls.length === 0) return state;

  switch (action.type) {
    case "nextWall":
    case "prevWall": {
      const i = clamp(wallIndex(layout, state) + (action.type === "nextWall" ? 1 : -1), 0, allWalls.length - 1);
      const target = allWalls[i];
      if (target.room === state.room && target.wall === state.wall) return state;
      return { ...target, spot: 0, focus: null };
    }
    case "nextSpot": {
      if (state.spot < wallLength(layout, state.room, state.wall) - 1) return { ...state, spot: state.spot + 1, focus: null };
      const i = wallIndex(layout, state) + 1;
      return i < allWalls.length ? { ...allWalls[i], spot: 0, focus: null } : state;
    }
    case "prevSpot": {
      if (state.spot > 0) return { ...state, spot: state.spot - 1, focus: null };
      const i = wallIndex(layout, state) - 1;
      if (i < 0) return state;
      const target = allWalls[i];
      return { ...target, spot: wallLength(layout, target.room, target.wall) - 1, focus: null };
    }
    case "goRoom": {
      const room = clamp(action.room, 0, layout.rooms.length - 1);
      return layout.rooms[room].walls.length ? { room, wall: 0, spot: 0, focus: null } : state;
    }
    case "goWall": {
      if (wallLength(layout, action.room, action.wall) === 0) return state;
      return { room: action.room, wall: action.wall, spot: 0, focus: null };
    }
    case "focus": {
      const stop = locate(layout, action.slug);
      return stop ? { room: stop.room, wall: stop.wall, spot: stop.spot, focus: stop.slug } : state;
    }
    case "nextArtwork":
    case "prevArtwork": {
      const stops = itinerary(layout);
      const current = state.focus
        ? stops.findIndex((s) => s.slug === state.focus)
        : stops.findIndex((s) => s.room === state.room && s.wall === state.wall && s.spot === state.spot);
      const target = stops[clamp(current + (action.type === "nextArtwork" ? 1 : -1), 0, stops.length - 1)];
      return target ? { room: target.room, wall: target.wall, spot: target.spot, focus: target.slug } : state;
    }
    case "closeFocus":
      return { ...state, focus: null };
  }
}

/** Position initiale à partir de l'URL (?salle=2&mur=1&oeuvre=slug), bornes comprises. */
export function positionFromQuery(
  layout: VisitLayout,
  query: { salle?: string | null; mur?: string | null; oeuvre?: string | null },
): VisitPosition {
  if (query.oeuvre) {
    const stop = locate(layout, query.oeuvre);
    if (stop) return { room: stop.room, wall: stop.wall, spot: stop.spot, focus: stop.slug };
  }
  if (layout.rooms.length === 0) return START;
  const room = clamp((Number(query.salle) || 1) - 1, 0, layout.rooms.length - 1);
  const wallCount = layout.rooms[room].walls.length;
  const wall = wallCount ? clamp((Number(query.mur) || 1) - 1, 0, wallCount - 1) : 0;
  return { room, wall, spot: 0, focus: null };
}

/** Paramètres d'URL de la position (partage d'un lien qui ouvre la bonne œuvre). */
export function positionToQuery(p: VisitPosition): Record<string, string> {
  const query: Record<string, string> = { salle: String(p.room + 1), mur: String(p.wall + 1) };
  if (p.focus) query.oeuvre = p.focus;
  return query;
}

/** Position dans le parcours (1-based) et total, pour « Œuvre 3 / 12 ». */
export function progress(layout: VisitLayout, p: VisitPosition): { index: number; total: number } {
  const stops = itinerary(layout);
  const i = stops.findIndex((s) => (p.focus ? s.slug === p.focus : s.room === p.room && s.wall === p.wall && s.spot === p.spot));
  return { index: i + 1, total: stops.length };
}
