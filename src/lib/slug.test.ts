import { describe, expect, it } from "vitest";
import { slugify, uniqueSlug } from "./slug";

describe("slugify", () => {
  it("retire accents, apostrophes et ponctuation", () => {
    expect(slugify("Élévation crépusculaire")).toBe("elevation-crepusculaire");
    expect(slugify("L'Esprit des Origines")).toBe("l-esprit-des-origines");
    expect(slugify("Lagos, 3 h du matin !")).toBe("lagos-3-h-du-matin");
  });
  it("ne renvoie jamais une chaîne vide", () => {
    expect(slugify("¡¿")).toBe("sans-titre");
  });
});

describe("uniqueSlug", () => {
  it("ajoute un suffixe si le slug est pris", () => {
    expect(uniqueSlug("mami-wata", [])).toBe("mami-wata");
    expect(uniqueSlug("mami-wata", ["mami-wata", "mami-wata-2"])).toBe("mami-wata-3");
  });
});
