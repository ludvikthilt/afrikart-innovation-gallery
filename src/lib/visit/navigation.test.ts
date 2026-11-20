import { describe, expect, it } from "vitest";
import { positionFromQuery, positionToQuery, progress, START, visitReducer, type VisitLayout } from "./navigation";

// Salle 1 : mur A (a1, a2), mur B (b1) — Salle 2 : mur C (c1, c2)
const layout: VisitLayout = {
  rooms: [
    { walls: [{ artworks: [{ slug: "a1" }, { slug: "a2" }] }, { artworks: [{ slug: "b1" }] }] },
    { walls: [{ artworks: [{ slug: "c1" }, { slug: "c2" }] }] },
  ],
};
const reduce = (state = START, ...actions: Parameters<typeof visitReducer>[2][]) =>
  actions.reduce((s, a) => visitReducer(layout, s, a), state);

describe("navigation de mur en mur", () => {
  it("avance au mur suivant puis passe à la salle suivante", () => {
    expect(reduce(START, { type: "nextWall" })).toEqual({ room: 0, wall: 1, spot: 0, focus: null });
    expect(reduce(START, { type: "nextWall" }, { type: "nextWall" })).toEqual({ room: 1, wall: 0, spot: 0, focus: null });
  });
  it("s'arrête aux extrémités du parcours", () => {
    expect(reduce(START, { type: "prevWall" })).toBe(START);
    const end = reduce(START, { type: "nextWall" }, { type: "nextWall" });
    expect(reduce(end, { type: "nextWall" })).toBe(end);
  });
  it("quitte le focus en changeant de mur", () => {
    const focused = reduce(START, { type: "focus", slug: "a2" });
    expect(reduce(focused, { type: "nextWall" }).focus).toBeNull();
  });
});

describe("navigation œuvre par œuvre (mobile)", () => {
  it("parcourt les œuvres d'un mur puis enchaîne sur le mur suivant", () => {
    expect(reduce(START, { type: "nextSpot" })).toMatchObject({ wall: 0, spot: 1 });
    expect(reduce(START, { type: "nextSpot" }, { type: "nextSpot" })).toMatchObject({ wall: 1, spot: 0 });
  });
  it("revient à la dernière œuvre du mur précédent", () => {
    const b = reduce(START, { type: "goWall", room: 0, wall: 1 });
    expect(reduce(b, { type: "prevSpot" })).toMatchObject({ room: 0, wall: 0, spot: 1 });
  });
});

describe("focus", () => {
  it("se place devant l'œuvre demandée, où qu'elle soit", () => {
    expect(reduce(START, { type: "focus", slug: "c2" })).toEqual({ room: 1, wall: 0, spot: 1, focus: "c2" });
  });
  it("ignore un slug inconnu", () => {
    expect(reduce(START, { type: "focus", slug: "inconnu" })).toBe(START);
  });
  it("œuvre suivante / précédente traverse murs et salles", () => {
    const b1 = reduce(START, { type: "focus", slug: "b1" });
    expect(reduce(b1, { type: "nextArtwork" }).focus).toBe("c1");
    expect(reduce(b1, { type: "prevArtwork" }).focus).toBe("a2");
  });
  it("fermer le focus garde la position", () => {
    const c2 = reduce(START, { type: "focus", slug: "c2" }, { type: "closeFocus" });
    expect(c2).toEqual({ room: 1, wall: 0, spot: 1, focus: null });
  });
});

describe("URL partageable", () => {
  it("ouvre directement l'œuvre du lien", () => {
    expect(positionFromQuery(layout, { salle: "1", oeuvre: "c1" })).toEqual({ room: 1, wall: 0, spot: 0, focus: "c1" });
  });
  it("borne une salle ou un mur hors limites", () => {
    expect(positionFromQuery(layout, { salle: "9", mur: "9" })).toEqual({ room: 1, wall: 0, spot: 0, focus: null });
    expect(positionFromQuery(layout, { salle: "abc" })).toEqual(START);
  });
  it("aller-retour position → URL → position", () => {
    const p = reduce(START, { type: "focus", slug: "b1" });
    expect(positionFromQuery(layout, positionToQuery(p))).toEqual(p);
  });
  it("indique la progression", () => {
    expect(progress(layout, reduce(START, { type: "focus", slug: "c1" }))).toEqual({ index: 4, total: 5 });
  });
});
