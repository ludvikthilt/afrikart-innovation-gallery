// Tests de la base (schéma, seed, RLS) dans PGlite : Postgres en WebAssembly,
// sans Docker. Lancement : npm run test:db
//
// On simule les rôles Supabase (anon / authenticated) avec SET ROLE et le
// claim JWT « sub » lu par auth.uid().

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { unaccent } from "@electric-sql/pglite/contrib/unaccent";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";

const root = fileURLToPath(new URL("..", import.meta.url));
const sql = (path) => readFileSync(join(root, path), "utf8");

const ADMIN = "a0000000-0000-4000-8000-000000000001";
const AICHA = "a0000000-0000-4000-8000-000000000002";
const KOFFI = "a0000000-0000-4000-8000-000000000003";
const VISITOR = "a0000000-0000-4000-8000-000000000005";
const EXPO = "e0000000-0000-4000-8000-000000000001";
const AICHA_WORK = "b0000000-0000-4000-8000-000000000001";
const KOFFI_WORK = "b0000000-0000-4000-8000-000000000006";

const db = new PGlite({ extensions: { pg_trgm, unaccent, pgcrypto } });

// --- installation -----------------------------------------------------------
await db.exec(sql("supabase/tests/supabase-stubs.sql"));
// PGlite ne gère pas la réplication logique : on neutralise la publication Realtime.
const stripRealtime = (text) => text.replace(/^alter publication supabase_realtime.*$/gim, "");
for (const file of readdirSync(join(root, "supabase/migrations")).sort()) {
  await db.exec(stripRealtime(sql(`supabase/migrations/${file}`)));
}
await db.exec(sql("supabase/seed.sql"));

// --- outils -----------------------------------------------------------------
let passed = 0;
const failures = [];

async function as(userId, fn) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [userId ?? ""]);
  await db.exec(userId ? "set role authenticated" : "set role anon");
  try {
    return await fn();
  } finally {
    await db.exec("reset role");
  }
}

async function check(name, fn) {
  await db.exec("begin");
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (error) {
    failures.push(name);
    console.log(`  ✗ ${name}\n      ${error.message}`);
  } finally {
    await db.exec("reset role");
    await db.exec("rollback");
  }
}

const rows = async (query, params) => (await db.query(query, params)).rows;
const count = async (query, params) => (await rows(query, params)).length;

function expect(actual, expected, label = "") {
  if (actual !== expected) throw new Error(`${label} attendu ${expected}, obtenu ${actual}`);
}

async function expectDenied(fn) {
  await db.exec("savepoint denied");
  try {
    const result = await fn();
    // Une RLS « using » qui filtre ne lève pas d'erreur : 0 ligne touchée = refusé.
    if (result && typeof result.affectedRows === "number" && result.affectedRows === 0) {
      await db.exec("release savepoint denied");
      return;
    }
  } catch {
    await db.exec("rollback to savepoint denied");
    return;
  }
  throw new Error("l'opération aurait dû être refusée");
}

// --- tests ------------------------------------------------------------------
console.log("\nSeed");
await check("5 profils créés par le trigger d'inscription", async () => {
  expect(await count("select 1 from public.profiles"), 5);
});
await check("une seule exposition en cours", async () => {
  await expectDenied(() =>
    db.query(
      "insert into public.exhibitions (title, slug, starts_at, ends_at, is_current, is_published) values ('B','b','2026-01-01','2026-01-02',true,true)",
    ),
  );
});

console.log("\nAnonyme");
await check("voit les œuvres publiées, l'exposition et ses salles", async () => {
  await as(null, async () => {
    expect(await count("select 1 from public.artworks"), 12, "œuvres");
    expect(await count("select 1 from public.exhibition_rooms"), 2, "salles");
    expect(await count("select 1 from public.exhibition_artworks"), 11, "placements validés seulement");
  });
});
await check("ne voit pas une œuvre brouillon", async () => {
  await db.query("update public.artworks set is_published = false where id = $1", [AICHA_WORK]);
  await as(null, async () => {
    expect(await count("select 1 from public.artworks where id = $1", [AICHA_WORK]), 0);
  });
});
await check("ne peut ni liker ni commenter", async () => {
  await as(null, async () => {
    await expectDenied(() => db.query("insert into public.likes (user_id, artwork_id) values ($1, $2)", [VISITOR, AICHA_WORK]));
  });
});
await check("ne lit ni demandes d'artiste ni messages", async () => {
  await as(null, async () => {
    expect(await count("select 1 from public.artist_requests"), 0);
    expect(await count("select 1 from public.messages"), 0);
  });
});
await check("la recherche trouve « gardien » et tolère « mbarg »", async () => {
  await as(null, async () => {
    const works = await rows("select * from public.search_gallery('gardien') where kind = 'artwork'");
    expect(works[0]?.slug, "le-gardien-du-fleuve");
    expect(works[0]?.exhibition_slug, "lumieres-d-afrique", "téléportation vers la salle");
    const artists = await rows("select * from public.search_gallery('mbarg') where kind = 'artist'");
    expect(artists[0]?.slug, "aicha-mbarga");
  });
});

console.log("\nVisiteur inscrit");
await check("ne peut pas se donner le rôle artiste ou admin", async () => {
  await as(VISITOR, async () => {
    await expectDenied(() => db.query("update public.profiles set role = 'admin' where id = $1", [VISITOR]));
  });
});
await check("modifie son propre profil, pas celui d'un autre", async () => {
  await as(VISITOR, async () => {
    const own = await db.query("update public.profiles set bio = 'Bonjour' where id = $1", [VISITOR]);
    expect(own.affectedRows, 1);
    await expectDenied(() => db.query("update public.profiles set bio = 'pirate' where id = $1", [AICHA]));
  });
});
await check("like et commente une œuvre publique", async () => {
  await as(VISITOR, async () => {
    await db.query("insert into public.likes (user_id, artwork_id) values ($1, $2)", [VISITOR, KOFFI_WORK]);
    await db.query("insert into public.comments (user_id, artwork_id, body) values ($1, $2, 'Superbe')", [VISITOR, KOFFI_WORK]);
  });
});
await check("ne like pas au nom d'un autre", async () => {
  await as(VISITOR, async () => {
    await expectDenied(() => db.query("insert into public.likes (user_id, artwork_id) values ($1, $2)", [AICHA, KOFFI_WORK]));
  });
});
await check("ne crée pas d'œuvre (pas encore artiste)", async () => {
  await as(VISITOR, async () => {
    await expectDenied(() =>
      db.query(
        "insert into public.artworks (artist_id, title, slug, image_path, image_width, image_height) values ($1, 'x', 'x', 'x', 1, 1)",
        [VISITOR],
      ),
    );
  });
});
await check("contacte un artiste et échange des messages", async () => {
  const conv = await as(VISITOR, async () => {
    const [c] = await rows(
      "insert into public.conversations (artist_id, visitor_id, artwork_id) values ($1, $2, $3) returning id",
      [AICHA, VISITOR, AICHA_WORK],
    );
    await db.query("insert into public.messages (conversation_id, sender_id, body) values ($1, $2, 'Je suis intéressée')", [c.id, VISITOR]);
    return c.id;
  });
  await as(AICHA, async () => {
    expect(await count("select 1 from public.messages where conversation_id = $1", [conv]), 1, "l'artiste lit");
    const read = await db.query("update public.messages set read_at = now() where conversation_id = $1", [conv]);
    expect(read.affectedRows, 1, "l'artiste marque comme lu");
  });
  await as(KOFFI, async () => {
    expect(await count("select 1 from public.messages where conversation_id = $1", [conv]), 0, "un tiers ne lit pas");
  });
  await as(VISITOR, async () => {
    await expectDenied(() => db.query("update public.messages set body = 'modifié' where conversation_id = $1", [conv]));
  });
});
await check("une demande d'artiste à la fois, pas de demande pour un artiste", async () => {
  await as(VISITOR, async () => {
    await expectDenied(() =>
      db.query("insert into public.artist_requests (user_id, motivation, sample_images) values ($1, $2, '{a.jpg}')", [
        VISITOR,
        "Deuxième demande pendant que la première est en attente.",
      ]),
    );
  });
  await as(AICHA, async () => {
    await expectDenied(() =>
      db.query("insert into public.artist_requests (user_id, motivation, sample_images) values ($1, $2, '{a.jpg}')", [
        AICHA,
        "Je suis déjà artiste mais je redemande quand même.",
      ]),
    );
  });
});
await check("ne valide pas sa propre demande", async () => {
  await as(VISITOR, async () => {
    const [req] = await rows("select id from public.artist_requests where user_id = $1", [VISITOR]);
    await expectDenied(() => db.query("select public.review_artist_request($1, true)", [req.id]));
  });
});

console.log("\nArtiste");
await check("gère ses œuvres, pas celles des autres", async () => {
  await as(AICHA, async () => {
    const own = await db.query("update public.artworks set price = 460000 where id = $1", [AICHA_WORK]);
    expect(own.affectedRows, 1);
    await expectDenied(() => db.query("update public.artworks set price = 1 where id = $1", [KOFFI_WORK]));
  });
});
await check("ne met pas son œuvre en avant (réservé admin)", async () => {
  await as(AICHA, async () => {
    await expectDenied(() => db.query("update public.artworks set is_featured = true where id = $1", [
      "b0000000-0000-4000-8000-000000000002",
    ]));
  });
});
await check("ne range pas son œuvre dans la collection d'un autre", async () => {
  await as(KOFFI, async () => {
    await expectDenied(() =>
      db.query("update public.artworks set collection_id = 'c0000000-0000-4000-8000-000000000001' where id = $1", [KOFFI_WORK]),
    );
  });
});
await check("propose une œuvre, ne peut pas l'auto-valider ni la placer", async () => {
  await as(AICHA, async () => {
    await db.query(
      "insert into public.exhibition_artworks (exhibition_id, artwork_id, proposed_by) values ($1, 'b0000000-0000-4000-8000-000000000011', $2) on conflict do nothing",
      [EXPO, AICHA],
    );
    await expectDenied(() =>
      db.query("update public.exhibition_artworks set status = 'approved' where artwork_id = $1", [KOFFI_WORK]),
    );
    await expectDenied(() =>
      db.query(
        "insert into public.exhibition_artworks (exhibition_id, artwork_id, proposed_by, status) values ($1, 'b0000000-0000-4000-8000-000000000003', $2, 'approved')",
        [EXPO, AICHA],
      ),
    );
  });
});
await check("masque un commentaire sur son œuvre, pas sur celle d'un autre", async () => {
  await as(AICHA, async () => {
    const hidden = await db.query("update public.comments set is_hidden = true where artwork_id = $1", [AICHA_WORK]);
    expect(hidden.affectedRows, 1);
  });
  await as(KOFFI, async () => {
    await expectDenied(() =>
      db.query("update public.comments set is_hidden = true where artwork_id = 'b0000000-0000-4000-8000-000000000007'"),
    );
  });
});
await check("dépose une image dans son dossier seulement", async () => {
  await as(AICHA, async () => {
    await db.query("insert into storage.objects (bucket_id, name) values ('artworks', $1)", [`${AICHA}/oeuvre.webp`]);
    await expectDenied(() =>
      db.query("insert into storage.objects (bucket_id, name) values ('artworks', $1)", [`${KOFFI}/oeuvre.webp`]),
    );
  });
});

console.log("\nAdmin");
await check("valide une demande : le visiteur devient artiste", async () => {
  await as(ADMIN, async () => {
    const [req] = await rows("select id from public.artist_requests where user_id = $1", [VISITOR]);
    await db.query("select public.review_artist_request($1, true, 'Bienvenue')", [req.id]);
  });
  const [p] = await rows("select role from public.profiles where id = $1", [VISITOR]);
  expect(p.role, "artist");
});
await check("valide une proposition et la place sur un mur", async () => {
  await as(ADMIN, async () => {
    const res = await db.query(
      "update public.exhibition_artworks set status = 'approved', room_id = 'd0000000-0000-4000-8000-000000000002', wall = 'west', position = 1 where artwork_id = $1",
      [KOFFI_WORK],
    );
    expect(res.affectedRows, 1);
    const [row] = await rows("select validated_by from public.exhibition_artworks where artwork_id = $1", [KOFFI_WORK]);
    expect(row.validated_by, ADMIN, "validated_by");
  });
});
await check("met une œuvre en avant et lit tout", async () => {
  await as(ADMIN, async () => {
    const res = await db.query("update public.artworks set is_featured = true where id = $1", [KOFFI_WORK]);
    expect(res.affectedRows, 1);
    expect(await count("select 1 from public.artist_requests"), 1);
  });
});
await check("ne modifie pas son propre rôle", async () => {
  await as(ADMIN, async () => {
    await expectDenied(() => db.query("update public.profiles set role = 'visitor' where id = $1", [ADMIN]));
  });
});

console.log(`\n${passed} réussis, ${failures.length} échoués`);
await db.close();
process.exit(failures.length ? 1 : 0);
