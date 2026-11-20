// Fusionne un fichier d'ajouts { fr: {...}, en: {...} } dans messages/*.json
// puis vérifie que fr et en ont exactement les mêmes clés.
// Usage : node scripts/merge-messages.mjs chemin/ajouts.json   (ou sans argument : vérification seule)
import { readFileSync, writeFileSync } from "node:fs";

const path = (l) => new URL(`../messages/${l}.json`, import.meta.url);
const load = (l) => JSON.parse(readFileSync(path(l), "utf8"));

function merge(target, source) {
  for (const [k, v] of Object.entries(source)) {
    if (v && typeof v === "object" && !Array.isArray(v)) target[k] = merge(target[k] ?? {}, v);
    else target[k] = v;
  }
  return target;
}

const keys = (obj, prefix = "") =>
  Object.entries(obj).flatMap(([k, v]) => (v && typeof v === "object" ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`]));

const additions = process.argv[2] ? JSON.parse(readFileSync(process.argv[2], "utf8")) : {};
const fr = merge(load("fr"), additions.fr ?? {});
const en = merge(load("en"), additions.en ?? {});
writeFileSync(path("fr"), JSON.stringify(fr, null, 2) + "\n");
writeFileSync(path("en"), JSON.stringify(en, null, 2) + "\n");

const a = new Set(keys(fr));
const b = new Set(keys(en));
const missingEn = [...a].filter((k) => !b.has(k));
const missingFr = [...b].filter((k) => !a.has(k));
if (missingEn.length || missingFr.length) {
  console.error("Clés manquantes en EN :", missingEn, "\nClés manquantes en FR :", missingFr);
  process.exit(1);
}
console.log(`messages OK (${a.size} clés)`);
