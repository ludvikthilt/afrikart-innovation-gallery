# Décisions techniques

Format : décision, puis pourquoi. Les plus récentes en bas.

## Phase 1 — Fondations (2026-11-20)

**Next.js 16.4 + `cacheComponents: false`.**
Le gabarit actuel active Cache Components par défaut. Avec ce mode, chaque lecture de cookies (session Supabase) doit être isolée derrière un `<Suspense>`, sous peine d'erreur de build. Comme presque toutes les pages lisent la session, j'ai désactivé le mode et gardé le rendu dynamique classique. C'est plus simple et plus sûr avant le festival. On pourra le réactiver page par page plus tard.

**`proxy.ts` (ex-`middleware.ts`).** Next 16 a renommé Middleware en Proxy. Le proxy enchaîne trois choses : la langue (next-intl), le rafraîchissement de session (`@supabase/ssr`, `getClaims()`), et une redirection optimiste vers `/connexion` pour `/studio`, `/admin`, `/compte` et `/messages`. Le rôle est **revérifié côté serveur** dans les layouts (`requireRole`), jamais seulement dans le proxy.

**i18n avec next-intl 4, FR par défaut sans préfixe, EN sous `/en`.** Les URL françaises (celles des QR codes et des cartels) restent courtes et stables. Les slugs de route restent en français dans les deux langues (`/en/oeuvres/…`) : un lien partagé fonctionne quelle que soit la langue. La langue est lue via `next/root-params` (recommandé par next-intl), avec repli sur la valeur du proxy dans les Server Actions.

**Contenus traduisibles via des colonnes `*_en` facultatives** (et non une table de traductions). Il n'y a que deux langues, le schéma reste lisible, et le repli sur le français est trivial (`localized()`).

**Identité de la galerie dans `.env` (commité, sans secret).** Les secrets vont dans `.env.local`. Toutes les variables d'identité sont lues dans `src/config/brand.ts` avec des valeurs par défaut, donc une variable vide ne casse rien. Les couleurs sont injectées en variables CSS (`--brand-*`) que Tailwind consomme. Changer une couleur ne demande donc qu'un rebuild, sans toucher au CSS. Limite : les polices passent par `next/font`, chargé au build, et ne sont pas paramétrables par variable d'environnement.

**Enums en anglais (`available`, `reserved`…), libellés dans `messages/*.json`.** Le brief listait des statuts en français. Des valeurs techniques neutres évitent de mélanger donnée et langue d'affichage.

**Règles par colonne = triggers `guard_*`, en plus de la RLS.** La RLS filtre des lignes, pas des colonnes. Les triggers empêchent donc qu'un utilisateur change son rôle, qu'un artiste mette son œuvre en avant ou s'auto-valide dans une exposition, ou qu'un message soit modifié après envoi. Ils ne s'appliquent qu'aux rôles API (`anon`, `authenticated`). Le seed, les migrations et le `service_role` passent.

**Validation d'une demande d'artiste = RPC `review_artist_request`** (`security definer`, réservée aux admins). La décision sur la demande et la promotion du rôle se font dans une seule transaction.

**Cohérences garanties par des clés étrangères composites** : la collection d'une œuvre appartient au même artiste, et la salle d'un placement appartient à la même exposition. Une seule exposition peut être « en cours » (index unique partiel), et elle est forcément publiée.

**Recherche** : `tsvector` en config `simple` + `unaccent` (galerie bilingue, pas de racinisation française imposée à un titre anglais), plus `pg_trgm` pour la tolérance aux fautes (« mbarg » trouve « Mbarga »). La RPC `search_gallery` est `security invoker` : la RLS s'applique. Elle renvoie aussi la salle de l'expo en cours, pour « téléporter » le visiteur.

**Buckets publics pour les images d'œuvres.** La lecture se fait par URL publique (CDN, pas de signature à chaque affichage). Une œuvre non publiée n'est pas listable, et son chemin contient des UUID. Les pièces jointes des demandes d'artiste sont dans un bucket privé.

**Tests RLS avec PGlite** (`@electric-sql/pglite`, devDependency, environ 10 Mo). C'est Postgres en WebAssembly : `npm run test:db` exécute les vraies migrations et le seed, puis 25 scénarios par rôle, sans Docker. L'environnement Supabase (auth, storage, rôles) est imité par `supabase/tests/supabase-stubs.sql`. Limite : Realtime n'est pas testé, faute de réplication logique dans PGlite.

**Types BDD écrits à la main au format `supabase gen types`.** Aucune base ne tournait au moment de la phase 1 (pas de Docker). `npm run db:types` génère la version officielle à comparer et à substituer.

**Pas de librairie d'icônes** : huit icônes SVG au trait fin dans `components/ui/icons.tsx`, donc zéro dépendance.

**Seed avec images Lorem Picsum.** Ce sont des placeholders libres de droits (voir `SEED_SOURCES.md`). `image_path` accepte une URL absolue, uniquement pour ce cas. Les vraies œuvres passeront par Storage.

## Phases 2 à 7 (2026-11-20)

**Une seule source de vérité pour « où est le visiteur »** : `src/lib/visit/navigation.ts`, un réducteur pur (salle, mur, œuvre sur le mur, focus) testé en unitaire (`npm test`). La visite légère et la visite 3D lisent le même état et envoient les mêmes actions. L'URL (`?salle=&mur=&oeuvre=`) est mise à jour avec `history.replaceState` : pas de rechargement serveur à chaque pas, et le lien reste partageable.

**Mobile = navigation œuvre par œuvre, ordinateur = mur par mur.** Même réducteur (`nextSpot` / `nextWall`). Sur un écran étroit, un mur de 3 œuvres serait illisible.

**Visite légère (2.5D) en CSS 3D + Motion** (`motion`, ~30 ko gz, seule librairie d'animation). Le mur de face est à plat, les murs voisins en `rotateY`, et la transition imite une rotation de caméra (800 ms, easing `[0.22, 1, 0.36, 1]`). Avec `prefers-reduced-motion`, les mouvements deviennent des fondus.

**Visite 3D : three + @react-three/fiber + drei** (justifié par le brief). Le composant est chargé par `next/dynamic` avec `ssr: false` : ni le hall ni la visite légère ne téléchargent ce JS. Le reste suit le budget : `frameloop="demand"` (on ne rend que pendant les déplacements), `dpr` [1, 1.5], aucune ombre temps réel (halo de projecteur = texture additive). Les textures vont de la miniature à la moyenne pour le mur courant et l'œuvre en focus, et sont libérées (`dispose`) quand on quitte la salle. Les fps sont mesurés pendant les déplacements : sous 30 fps deux fois de suite, on passe en visite légère avec un message discret, pour la session.

**Détection automatique du mode** (mémoire, cœurs, `navigator.connection`, `prefers-reduced-motion`, WebGL2). L'interrupteur « Visite 3D / Visite légère » est mémorisé dans `localStorage`.

**Pipeline d'images : envoi direct navigateur → Storage, puis traitement serveur (sharp).** Vercel limite le corps d'une requête à 4,5 Mo ; une photo d'œuvre fait souvent plus. L'original part donc dans `artworks/{uid}/{uuid}/original.*` (RLS : dossier de l'artiste), puis une Server Action génère `full.webp` (3200 px), `medium.webp` (1600 px), `thumb.webp` (400 px), la couleur dominante et le blurhash, puis supprime l'original. `sharp` et `blurhash` sont les deux dépendances ajoutées pour cela.

**Pas de `SUPABASE_SERVICE_ROLE_KEY` dans le code.** Toutes les opérations (y compris admin) passent par la session de l'utilisateur et la RLS ; la variable reste dans `.env.example` pour un usage futur, mais n'est jamais lue.

**Messagerie temps réel = Supabase Realtime (`postgres_changes`) côté client**, RLS appliquée. L'envoi passe par une Server Action validée par Zod.

**Recherche : palette `<dialog>` native (Ctrl/⌘ K) + route `/api/search`**, plus une page `/recherche` qui marche sans JavaScript. Un résultat « œuvre exposée » ouvre la visite directement devant l'œuvre.

**Cartel imprimable via l'impression du navigateur (CSS `@page A6`)** plutôt qu'une librairie PDF : « Imprimer » propose « Enregistrer en PDF » partout, sans 300 ko de JS en plus. Le QR (`qrcode`, SVG/PNG) encode l'URL sans préfixe de langue.

**Conversion indicative EUR/USD** : l'euro est à parité fixe BEAC (655,957 XAF). Le dollar vient d'open.er-api.com (sans clé), mis en cache 24 h, avec une valeur de repli datée. La source et la date sont affichées au survol et lues par les lecteurs d'écran.

**Mode borne / mode écran dans un groupe de routes sans barre de navigation** (`(plein-ecran)`). La borne revient au début après `NEXT_PUBLIC_KIOSK_IDLE_MINUTES` d'inactivité.

**Tests** : Vitest pour la navigation et les slugs, PGlite pour la RLS (`npm run test:db`), Playwright pour le parcours visiteur (`npm run test:e2e`, nécessite Supabase local + seed ; utilise Microsoft Edge installé, sans téléchargement).
