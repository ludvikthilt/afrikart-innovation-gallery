# PROMPT — AFRIK'ART INNOVATION GALLERY

> À coller dans Claude Code à la racine d'un dossier vide (ou à enregistrer comme `CLAUDE.md` du projet).

---

## 0. Ton rôle et ta façon de travailler

Tu es le développeur principal d'**AFRIK'ART INNOVATION GALLERY**, une galerie d'art numérique (arts visuels) pensée comme une **galerie phygitale** : elle relie le monde physique et le monde numérique, pour qu'une jeune structure culturelle puisse exposer et vendre à l'international. Le projet sera présenté au 12e Festival Universitaire des Arts et de la Culture (UNIFAC, Université de Dschang, 23–27 novembre 2026).

Règles de travail :
- **Avance par phases** (section 9). À la fin de chaque phase : l'app compile, `npm run build` passe, `npm run lint` passe, et tu me donnes un résumé court de ce qui marche et de ce qu'il me reste à faire (variables d'env, commandes Supabase, etc.).
- **Ne devine pas les versions ni les API.** Avant d'installer une librairie, vérifie sa version stable actuelle et sa doc (Next.js, Supabase, React Three Fiber, drei). Si une API a changé, suis la doc à jour, pas ta mémoire.
- **Pose-moi une question** seulement si une décision est coûteuse à défaire (schéma de BDD, modèle de rôles). Sinon, choisis l'option la plus simple, note-la dans `DECISIONS.md` et continue.
- Code en **TypeScript strict**. Interface en **français** (prévois l'i18n pour l'anglais plus tard, voir phase 6).
- Pas de dépendance ajoutée sans raison. Chaque dépendance lourde doit être justifiée dans `DECISIONS.md`.

---

## 1. Stack imposée

- **Next.js** (App Router, Server Components, Server Actions), déployé sur **Vercel**.
- **Supabase** : Auth (email + mot de passe, et magic link), Postgres avec **RLS activé sur toutes les tables**, Storage pour les images, Realtime pour la messagerie.
- Client Supabase via `@supabase/ssr` (cookies, middleware de rafraîchissement de session).
- **3D** : `three` + `@react-three/fiber` + `@react-three/drei`. Le canvas est un composant client chargé avec `next/dynamic` et `ssr: false`.
- **Animation UI** : une seule librairie (Framer Motion / Motion), utilisée avec retenue.
- **Styles** : Tailwind CSS.
- **Validation** : Zod pour tous les formulaires et Server Actions.
- Types BDD générés avec `supabase gen types typescript`.

---

## 2. La vision : le cœur du projet (à lire deux fois)

Ce site **n'est pas** une page où l'on fait défiler une grille d'images, et ce **n'est pas** non plus une démo technique qui épuise le visiteur ou son téléphone.
Le but : **on visite une galerie.** La technique est au service de la visite, jamais l'inverse.

Principes non négociables :

1. **On se déplace, on ne scrolle pas.** La galerie est faite de **salles** et de **murs**. Le visiteur passe d'une œuvre à l'autre ou d'un mur à l'autre avec des gestes simples : flèches gauche/droite, swipe, clic sur l'œuvre suivante, ou les miniatures d'un plan. Aucune page ne doit demander un long défilement pour atteindre une œuvre.
2. **Une œuvre est atteignable en 3 interactions maximum** depuis l'entrée (entrée → salle → œuvre). Depuis la recherche, une seule.
3. **Déplacement sur rails, pas FPS libre.** La caméra glisse d'un point de vue prédéfini à un autre (transitions douces de 600 à 900 ms, easing naturel). Pas de contrôle ZQSD, pas de visiteur perdu dans un coin, pas de mal des transports.
4. **« Sur le chemin de la 3D »** : l'expérience est progressive.
   - **Niveau 1 (par défaut sur mobile modeste / connexion lente)** : salle en **2.5D**, avec des murs en perspective CSS/WebGL légers, un parallaxe discret et des transitions caméra simulées. Rendu rapide.
   - **Niveau 2 (appareils capables)** : vraie salle 3D (R3F) avec murs, sol, éclairage doux et cadres. Les œuvres sont des textures sur des plans.
   - Détection automatique (GPU, mémoire, `navigator.connection`, `prefers-reduced-motion`) + un **interrupteur manuel** « Visite 3D / Visite légère » toujours visible.
5. **Focus sur l'œuvre** : un tap sur une œuvre fait avancer la caméra face à elle, puis un **panneau d'information** glisse sur le côté (en bas sur mobile) : titre, artiste, date, technique, dimensions, description, prix et statut si l'œuvre est en vente, like, commentaires, bouton « Contacter l'artiste ». Fermer le panneau ramène la vue de la salle. Zoom haute définition disponible (pinch / molette) sans quitter la salle.
6. **Ambiance de galerie** : fond sombre et feutré ou blanc muséal (deux thèmes de salle possibles par exposition), cartels sobres, typographie élégante, beaucoup d'air. Inspiration : borne tactile de musée et salle d'écrans verticaux dans le noir. Les œuvres sont les seules sources de couleur vive.
7. **Sobriété** : pas de particules décoratives, pas d'effets qui n'aident pas à regarder l'art. Budget performance (section 7) respecté.
8. **Accessibilité** : navigation complète au clavier, focus visible, `aria-live` pour annoncer l'œuvre courante, textes alternatifs obligatoires, `prefers-reduced-motion` respecté (transitions remplacées par des fondus).

### Parcours visiteur cible
`Entrée (hall d'accueil : exposition en cours et bouton « Entrer »)` → `Salle(s) de l'exposition` → `Focus œuvre` → (optionnel) `Profil artiste` (présenté comme le mur personnel de l'artiste, navigable de la même manière) → `Contacter`.

Un **plan de la galerie** (mini-carte avec les salles et les miniatures) permet de sauter partout en un geste.

---

## 3. Rôles et règles métier

| Rôle | Peut faire |
|---|---|
| **Visiteur anonyme** | Visiter l'exposition en cours et les œuvres mises en avant, chercher des artistes et des œuvres, consulter leurs fiches. |
| **Visiteur inscrit** | Tout ce qui précède + liker, commenter, contacter un artiste (messagerie interne), **demander à devenir artiste**. |
| **Artiste** | Gérer son profil public, ses **collections/séries** et ses **œuvres solo** (hors série) : créer, modifier, archiver, définir le prix et le statut de vente. Proposer des œuvres à une exposition. Répondre à ses messages. Modérer les commentaires de ses œuvres (masquer). |
| **Admin** | Valider ou refuser les demandes d'artiste, créer et gérer les **expositions** (dates, titre, texte curatorial, thème de salle, ordre et disposition des œuvres par salle et par mur), **valider les œuvres** présentées dans l'exposition, mettre des œuvres en avant, modérer tout le contenu. |

Règles :
- Inscription = toujours **visiteur**. Le statut d'artiste est accordé **uniquement** par un admin, après une demande (bio, portfolio/liens, 1 à 5 œuvres d'exemple, motivation).
- Une œuvre appartient à **0 ou 1 collection**. Sans collection = œuvre solo.
- Une seule exposition peut être « en cours » à la fois (contrainte BDD). Les expositions passées restent visitables comme archives.
- Une œuvre n'apparaît dans une exposition **que si l'admin l'a validée**.
- Le **prix** n'est affiché que si `for_sale = true`. Statuts : `disponible`, `réservée`, `vendue`, `non à vendre`. **Pas de paiement en ligne dans cette version** : la vente passe par la prise de contact avec l'artiste (bouton « Je suis intéressé·e » qui ouvre une conversation pré-remplie).
- Le rôle ne doit **jamais** pouvoir être modifié par l'utilisateur lui-même (RLS + champ protégé).

---

## 4. Modèle de données (Supabase / Postgres)

Propose les migrations SQL dans `supabase/migrations/`. Base de départ (ajuste si besoin et justifie) :

- `profiles` (id = auth.users.id, display_name, username unique, avatar_url, bio, country, city, website, socials jsonb, role enum `visitor|artist|admin` par défaut `visitor`, created_at)
- `artist_requests` (id, user_id, motivation, portfolio_links, sample_images text[], status enum `pending|approved|rejected`, admin_note, reviewed_by, reviewed_at, created_at)
- `collections` (id, artist_id, title, slug, description, cover_artwork_id, year, is_published, created_at)
- `artworks` (id, artist_id, collection_id nullable, title, slug, description, year/date, medium/technique, dimensions, image_path, image_width, image_height, dominant_color, blurhash, for_sale bool, price numeric, currency par défaut `XAF`, sale_status enum, is_published, is_featured, created_at, updated_at)
- `exhibitions` (id, title, slug, curatorial_text, starts_at, ends_at, is_current bool avec index unique partiel, room_theme enum `dark|museum`, cover_path, created_by)
- `exhibition_rooms` (id, exhibition_id, name, position)
- `exhibition_artworks` (exhibition_id, artwork_id, room_id, wall enum `north|east|south|west` ou index de mur, position, status enum `proposed|approved|rejected`, validated_by, validated_at)
- `likes` (user_id, artwork_id, created_at, PK composite)
- `comments` (id, artwork_id, user_id, body, is_hidden, created_at)
- `conversations` (id, artist_id, visitor_id, artwork_id nullable, created_at, unique(artist_id, visitor_id, artwork_id))
- `messages` (id, conversation_id, sender_id, body, read_at, created_at)
- Vues ou compteurs : `artwork_stats` (likes_count, comments_count).

**Recherche** : colonnes `tsvector` (titre, description, technique, nom d'artiste) avec index GIN + `pg_trgm` pour la tolérance aux fautes. Une RPC `search_gallery(q text)` qui renvoie artistes + œuvres + collections.

**RLS** : écris les policies pour chaque table et **teste-les** (script SQL ou tests qui simulent les rôles anon/visitor/artist/admin). Fonction helper `is_admin()` en `security definer`. Trigger qui crée le `profile` à l'inscription.

**Storage** : bucket `artworks` (lecture publique des œuvres publiées, écriture limitée à l'artiste propriétaire dans `artworks/{artist_id}/...`), bucket `avatars`, bucket privé `artist-requests`.

**Seed** : `supabase/seed.sql` avec 1 admin, 3 artistes, 2 collections, des œuvres solo et 1 exposition en cours de 2 salles. Utilise des images libres de droits ou des placeholders générés, et indique leur source dans `SEED_SOURCES.md`.

---

## 5. Images et performance des œuvres

- À l'upload (côté serveur), génère **3 variantes** : miniature (~400px), moyenne (~1600px) et pleine résolution. Utilise le **WebP/AVIF** et calcule `width`, `height`, `blurhash` et `dominant_color`.
- Dans la salle 3D : charge d'abord la miniature comme texture, puis remplace par la moyenne quand l'œuvre est proche ou en focus. La pleine résolution ne sert qu'au zoom.
- **Préchargement intelligent** : œuvre courante + 2 voisines seulement. Libère les textures hors champ (`dispose`).
- Placeholder `blurhash` / couleur dominante pendant le chargement : jamais de cadre vide.
- Ratio réel de l'œuvre respecté dans le cadre 3D (pas de déformation).

---

## 6. Pages et routes

Public :
- `/` : **Hall d'entrée**. Titre de l'exposition en cours, texte curatorial court, 3 à 5 œuvres mises en avant en vitrine et un bouton « Entrer dans la galerie ».
- `/visite/[expoSlug]` : **la visite immersive** (salles, murs, focus). Les URL suivent l'état : `/visite/[expoSlug]?salle=2&oeuvre=slug` permet de partager un lien qui ouvre directement la bonne œuvre au bon endroit.
- `/oeuvres/[slug]` : fiche œuvre « plein cadre », la cible des QR codes (voir phygital). Bouton « Voir dans la galerie ».
- `/artistes` et `/artistes/[username]` : mur de l'artiste (bio + œuvres navigables en mode salle) et ses collections.
- `/collections/[slug]`
- `/recherche` : **palette de recherche** ouvrable partout (`Ctrl/Cmd+K` ou icône loupe). Résultats instantanés groupés (Artistes / Œuvres / Collections). Un clic téléporte vers l'œuvre dans la salle si elle est exposée, sinon vers sa fiche.
- `/expositions` : archives.

Compte :
- `/connexion`, `/inscription`, `/compte`, `/compte/devenir-artiste`, `/messages` (liste et conversation en temps réel).

Artiste (`/studio`) : tableau de bord, œuvres (CRUD avec upload par glisser-déposer et aperçu « comment elle rendra au mur »), collections, propositions aux expositions, messages, commentaires.

Admin (`/admin`) : demandes d'artiste, expositions, **éditeur de salle** (glisser les œuvres validées sur les murs d'une salle, avec aperçu 2.5D), validation des œuvres proposées, mises en avant, modération.

Protection des routes `/studio` et `/admin` par middleware **et** par vérification côté serveur (jamais seulement côté client).

---

## 7. Budget performance et qualité (critères d'acceptation)

Cible réaliste : un smartphone Android milieu de gamme en **3G/4G** au Cameroun.
- Hall d'entrée interactif en **moins de 3 s** en 4G simulée. Le JS 3D n'est **pas** chargé sur le hall tant que le visiteur n'entre pas.
- Mode léger : **≥ 50 fps** sur mobile milieu de gamme. Mode 3D : ≥ 30 fps, sinon rétrogradation automatique vers le mode léger avec un message discret.
- `dpr` du canvas plafonné (ex. `[1, 1.5]`), `frameloop="demand"` quand rien ne bouge, pas d'ombres temps réel coûteuses (ombres précalculées ou faux AO).
- Lighthouse mobile sur `/` et `/oeuvres/[slug]` : Performance ≥ 85, Accessibilité ≥ 95, SEO ≥ 95.
- Métadonnées Open Graph par œuvre et par artiste (image de l'œuvre) pour le partage sur WhatsApp et les réseaux.
- Gestion d'erreurs et états vides soignés (exposition vide, pas de résultats, hors-ligne).

---

## 8. Dimension phygitale (lien avec le salon physique)

- Chaque œuvre a un **QR code** (généré dans le studio et l'admin, téléchargeable en PNG/SVG et en **cartel imprimable** PDF avec titre, artiste, prix et QR) qui pointe vers `/oeuvres/[slug]`.
- **Mode borne** (`/borne`) : plein écran, gros éléments tactiles, pas de clavier requis, retour automatique au hall après X minutes d'inactivité, aucune action de compte. Pensé pour une borne tactile ou une tablette posée sur un pupitre dans le stand.
- **Mode écran / diaporama** (`/ecran/[expoSlug]`) : défilement automatique, plein cadre, des œuvres de l'exposition avec cartel, pour un écran vertical ou un vidéoprojecteur.

---

## 9. Phases de livraison

1. **Fondations** : projet Next.js, Tailwind, Supabase (client/serveur/middleware), migrations, RLS, seed, auth, layout, thème visuel de base. Fichier `README.md` avec setup local + Vercel.
2. **Visite en mode léger (2.5D)** : hall, navigation salle/mur/œuvre, focus et panneau d'info, URL synchronisées, plan de galerie, clavier et swipe. *C'est la phase la plus importante : fais-la valider avant d'aller plus loin.*
3. **Visite 3D** : salle R3F sur rails, mêmes contrôles et même état que le mode léger (une seule source de vérité pour « où est le visiteur »), détection d'appareil et bascule.
4. **Social & recherche** : likes, commentaires, palette de recherche, profils artistes, messagerie temps réel, bouton « Je suis intéressé·e ».
5. **Studio artiste & admin** : CRUD œuvres/collections avec pipeline d'images, demandes d'artiste, gestion des expositions, éditeur de salle, validation, modération.
6. **Phygital & international** : QR codes, cartels PDF, mode borne, mode écran, i18n FR/EN, affichage du prix en XAF avec conversion indicative EUR/USD (source des taux affichée et datée).
7. **Finitions & déploiement** : audit performance/accessibilité, tests (unitaires pour la logique de navigation, tests RLS, un test e2e Playwright du parcours visiteur), déploiement Vercel, checklist de mise en production.

---

## 10. Livrables attendus dans le repo

- `README.md` : installation, variables d'environnement (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` côté serveur uniquement, etc.), commandes, déploiement Vercel, création du premier admin.
- `DECISIONS.md` : choix techniques et pourquoi.
- `supabase/migrations/*`, `supabase/seed.sql`.
- `.env.example` (aucun secret réel commité).

Commence par la **phase 1**. Avant d'écrire du code, montre-moi en 15 lignes maximum l'arborescence prévue et le schéma de navigation de la visite (états et transitions), puis enchaîne.
