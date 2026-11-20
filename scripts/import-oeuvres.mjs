// Importe les vraies œuvres (ref/ + scripts/oeuvres.json) dans un projet Supabase :
//  1. supprime les anciens comptes de démonstration du seed et les artistes importés ;
//  2. crée les comptes artistes (mot de passe aléatoire non communiqué) ;
//  3. prépare chaque image (WebP pleine / moyenne / miniature, blurhash, couleur dominante)
//     et l'envoie dans le bucket « artworks » ;
//  4. recrée l'exposition en cours : 4 salles, œuvres validées et accrochées.
//
// Usage (la clé secrète n'est jamais écrite sur disque) :
//   SUPABASE_URL=https://xxx.supabase.co SUPABASE_SECRET_KEY=sb_secret_... node scripts/import-oeuvres.mjs

import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { encode } from "blurhash";
import sharp from "sharp";

const root = fileURLToPath(new URL("..", import.meta.url));
const manifest = JSON.parse(readFileSync(join(root, "scripts/oeuvres.json"), "utf8"));
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) throw new Error("SUPABASE_URL et SUPABASE_SECRET_KEY sont requis");
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const must = (result, label) => {
  if (result.error) throw new Error(`${label} : ${result.error.message}`);
  return result.data;
};
const slugify = (v) =>
  v
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
const hex = (n) => Math.round(n).toString(16).padStart(2, "0");

// 1. Comptes de démonstration ------------------------------------------------
const { users } = must(await db.auth.admin.listUsers({ perPage: 1000 }), "liste des comptes");
const importDomain = "@artistes.afrikart.invalid";
// Uniquement les anciens comptes du seed (pas admin@afrikart.test, compte admin réel).
const DEMO = ["aicha", "koffi", "carla", "visiteur"].map((n) => `${n}@afrikart.test`);
for (const u of users.filter((u) => DEMO.includes(u.email ?? "") || u.email?.endsWith(importDomain))) {
  must(await db.auth.admin.deleteUser(u.id), `suppression ${u.email}`);
  console.log("supprimé", u.email);
}

// 2. Artistes --------------------------------------------------------------
const artistIds = {};
for (const a of manifest.artists) {
  const { user } = must(
    await db.auth.admin.createUser({
      email: `${a.username}${importDomain}`,
      password: randomBytes(32).toString("base64url"),
      email_confirm: true,
      user_metadata: { display_name: a.display_name, locale: "fr" },
    }),
    `création ${a.display_name}`,
  );
  must(
    await db
      .from("profiles")
      .update({ role: "artist", username: a.username, display_name: a.display_name, bio: a.bio, bio_en: a.bio_en, country: a.country ?? null })
      .eq("id", user.id),
    `profil ${a.display_name}`,
  );
  artistIds[a.key] = user.id;
  console.log("artiste", a.display_name);
}

// 3. Œuvres ----------------------------------------------------------------
const VARIANTS = [
  { col: "image_path", name: "full", size: 2400, quality: 86 },
  { col: "image_medium_path", name: "medium", size: 1600, quality: 82 },
  { col: "image_thumb_path", name: "thumb", size: 400, quality: 78 },
];
const artworkIds = [];
for (const w of manifest.artworks) {
  const artistId = artistIds[w.artist];
  const slug = slugify(w.title) + (manifest.artworks.filter((x) => slugify(x.title) === slugify(w.title)).length > 1 ? `-${w.artist}` : "");
  const base = sharp(readFileSync(join(root, "ref", w.file))).rotate();
  const meta = await base.metadata();
  const row = {
    artist_id: artistId,
    title: w.title,
    title_en: w.title_en,
    slug,
    medium: w.medium,
    medium_en: w.medium_en,
    image_width: meta.width,
    image_height: meta.height,
    image_alt: `${w.title} — ${manifest.artists.find((a) => a.key === w.artist).display_name}`,
    for_sale: false,
    sale_status: "not_for_sale",
    is_published: true,
    is_featured: Boolean(w.featured),
  };
  for (const v of VARIANTS) {
    const buffer = await base.clone().resize({ width: v.size, height: v.size, fit: "inside", withoutEnlargement: true }).webp({ quality: v.quality }).toBuffer();
    const path = `${artistId}/${slug}/${v.name}.webp`;
    must(await db.storage.from("artworks").upload(path, buffer, { contentType: "image/webp", upsert: true, cacheControl: "31536000" }), `envoi ${path}`);
    row[v.col] = path;
  }
  const { dominant } = await base.clone().resize(64, 64, { fit: "inside" }).stats();
  row.dominant_color = `#${hex(dominant.r)}${hex(dominant.g)}${hex(dominant.b)}`;
  const { data: px, info } = await base.clone().resize(32, 32, { fit: "inside" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  row.blurhash = encode(new Uint8ClampedArray(px), info.width, info.height, 4, 3);

  const { id } = must(await db.from("artworks").insert(row).select("id").single(), `œuvre ${w.title}`);
  artworkIds.push({ id, ...w });
  console.log("œuvre", w.title);
}

// 4. Exposition ------------------------------------------------------------
const e = manifest.exhibition;
const existing = must(await db.from("exhibitions").select("id").eq("slug", e.slug).maybeSingle(), "exposition");
await db.from("exhibitions").update({ is_current: false }).eq("is_current", true);
const fields = {
  title: e.title,
  title_en: e.title_en,
  curatorial_text: e.curatorial_text,
  curatorial_text_en: e.curatorial_text_en,
  starts_at: e.starts_at,
  ends_at: e.ends_at,
  room_theme: "museum",
  is_published: true,
  is_current: true,
};
let exhibitionId = existing?.id;
if (exhibitionId) must(await db.from("exhibitions").update(fields).eq("id", exhibitionId), "mise à jour exposition");
else exhibitionId = must(await db.from("exhibitions").insert({ ...fields, slug: e.slug }).select("id").single(), "création exposition").id;

must(await db.from("exhibition_rooms").delete().eq("exhibition_id", exhibitionId), "anciennes salles");
const rooms = must(
  await db
    .from("exhibition_rooms")
    .insert(e.rooms.map((r, i) => ({ exhibition_id: exhibitionId, name: r.name, name_en: r.name_en, position: i + 1 })))
    .select("id, position"),
  "salles",
);
const positions = {};
must(
  await db.from("exhibition_artworks").insert(
    artworkIds.map((w) => {
      const k = `${w.room}-${w.wall}`;
      positions[k] = (positions[k] ?? 0) + 1;
      return {
        exhibition_id: exhibitionId,
        artwork_id: w.id,
        room_id: rooms.find((r) => r.position === w.room).id,
        wall: w.wall,
        position: positions[k],
        status: "approved",
      };
    }),
  ),
  "accrochage",
);
console.log(`terminé : ${artworkIds.length} œuvres, ${rooms.length} salles`);
