# LE VILLAGE · Art Gallery

Projet né sous le nom de travail « AFRIK'ART INNOVATION GALLERY ». Nom, logo et couleurs se règlent dans `.env`.

Galerie d'art numérique « phygitale » : on visite une exposition comme une vraie galerie (salles, murs, œuvres), puis on contacte les artistes.
Stack : Next.js 16 (App Router), Supabase (Auth, Postgres + RLS, Storage, Realtime), Tailwind CSS 4, next-intl (FR/EN), Zod.

## Démarrage local

Prérequis : Node.js 20+ et, pour une base locale, Docker (pour `supabase start`).

```bash
npm install
cp .env.example .env.local      # puis remplir (voir ci-dessous)
npm run db:start                # Supabase local : applique migrations + seed
npm run dev                     # http://localhost:3000
```

`npm run db:start` affiche l'`API URL` et l'`anon key` : copiez-les dans `.env.local`.
Sans Supabase configuré, le site démarre quand même et affiche un hall vide avec un message.

Comptes de démonstration (seed, **local uniquement**), mot de passe `Afrikart2026!` :

| E-mail | Rôle |
|---|---|
| admin@afrikart.test | admin |
| aicha@afrikart.test, koffi@afrikart.test, carla@afrikart.test | artistes |
| visiteur@afrikart.test | visiteur (avec une demande d'artiste en attente) |

## Variables d'environnement

Deux fichiers :

- **`.env`** (commité, **aucun secret**) : l'identité de la galerie. Nom, sous-titre, accroche FR/EN, logos, favicon, image de partage, couleurs, contacts et réseaux, événement mis en avant, langue par défaut, devise, délai du mode borne. Chaque ligne est commentée. Après modification, relancez `npm run dev` ou redéployez : les `NEXT_PUBLIC_*` sont figées au build.
- **`.env.local`** (jamais commité) : l'URL du site et les clés Supabase.

| Variable | Où | Rôle |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | `.env.local` / Vercel | URL publique (Open Graph, QR codes, liens d'e-mail) |
| `NEXT_PUBLIC_SUPABASE_URL` | `.env.local` / Vercel | URL du projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `.env.local` / Vercel | Clé publique (anon) |
| `SUPABASE_SERVICE_ROLE_KEY` | `.env.local` / Vercel | Facultatif, non lu par le code actuel. **Serveur uniquement**, ne jamais préfixer par `NEXT_PUBLIC_`. |
| `NEXT_PUBLIC_BRAND_*`, `NEXT_PUBLIC_EVENT_*`… | `.env` | Identité visuelle, voir le fichier |

Pour changer le logo : déposez `public/brand/logo.svg`, puis `NEXT_PUBLIC_BRAND_LOGO_URL="/brand/logo.svg"`. Laissé vide, le logo est le texte nom + sous-titre.

## Langues (FR / EN)

- Le français est la langue par défaut, sans préfixe : `/oeuvres/le-gardien-du-fleuve`. L'anglais est préfixé : `/en/oeuvres/le-gardien-du-fleuve`. Les URL des QR codes restent ainsi stables.
- Le bouton `EN` / `FR` de la barre du haut change de langue sans quitter la page.
- Textes de l'interface : `messages/fr.json` (référence, vérifiée par TypeScript) et `messages/en.json`.
- Contenus : les champs `*_en` (titre d'expo, texte curatorial, nom de salle, description d'œuvre, bio…) sont facultatifs. À défaut, l'anglais affiche le texte français.

## Commandes

| Commande | Effet |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` / `npm start` | Build et serveur de production |
| `npm run lint` | ESLint |
| `npm run typecheck` | Génère les types de routes puis `tsc --noEmit` |
| `npm run test:db` | Schéma + seed + **25 tests RLS** (anonyme, visiteur, artiste, admin) dans PGlite, sans Docker |
| `npm run db:start` / `npm run db:reset` | Supabase local (Docker) : démarrer / réappliquer migrations + seed |
| `npm run db:types` | Génère `src/types/database.generated.ts` depuis la base locale |

## Base de données

- `supabase/migrations/` : schéma (`…100_schema`), RLS (`…200_rls`), Storage (`…300_storage`), recherche (`…400_search`).
- `supabase/seed.sql` : 1 admin, 3 artistes, 1 visiteur, 2 collections, 12 œuvres, l'exposition en cours « Lumières d'Afrique » (2 salles). Images : voir `SEED_SOURCES.md`.
- `supabase/tests/supabase-stubs.sql` sert seulement aux tests PGlite. Il n'est jamais appliqué sur Supabase.
- Les types TypeScript sont pour l'instant écrits à la main dans `src/types/database.ts`, au même format que la sortie de `supabase gen types`. Une fois une base disponible, lancez `npm run db:types` et comparez.

## Déploiement (Supabase + Vercel)

1. **Supabase** : créez un projet (région la plus proche, ex. `eu-west`), puis :
   ```bash
   npx supabase login
   npx supabase link --project-ref <ref>
   npx supabase db push            # applique les migrations (pas le seed)
   ```
   Dans *Authentication › URL Configuration* : `Site URL` = l'URL Vercel, et ajoutez `https://<domaine>/auth/confirm` aux *Redirect URLs*.
2. **Vercel** : importez le dépôt (framework Next.js détecté). Dans *Settings › Environment Variables*, ajoutez `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` et `SUPABASE_SERVICE_ROLE_KEY`. Le `.env` d'identité est lu automatiquement. Vous pouvez aussi surcharger une valeur de marque dans Vercel.
3. **Premier admin** : inscrivez-vous sur le site, puis dans *SQL Editor* :
   ```sql
   update public.profiles set role = 'admin'
   where id = (select id from auth.users where email = 'vous@exemple.com');
   ```
   Cette requête passe car l'éditeur SQL s'exécute en `postgres`. Depuis l'API, le rôle ne peut être changé que par un admin, et jamais sur son propre compte.

## Production (mise en ligne du 2026-11-20)

| | |
|---|---|
| Site | https://afrikart-umber.vercel.app |
| Vercel | projet `ludvikthilts-projects/afrikart`, fonctions en région `cdg1` (Paris, voir `vercel.json`) |
| Supabase | projet `afrikart`, ref `jrfutucafhsfpjsgujet`, région `eu-west-3` (Paris) |
| Mot de passe de la base | dans `.env.local` (`SUPABASE_DB_PASSWORD`), jamais commité |

- Données : migrations + seed de démonstration. Les comptes fictifs (`*@afrikart.test`) ont un mot de passe aléatoire non communiqué : personne ne peut s'y connecter.
- Confirmation d'e-mail **désactivée** : le service d'e-mail fourni par Supabase n'envoie qu'aux membres de l'organisation. Pour la réactiver, branchez un SMTP (Resend, Brevo…) dans *Authentication › SMTP*, puis remettez `enable_confirmations = true` dans `supabase/config.toml` et lancez `npx supabase config push`.
- Redéployer : `vercel deploy --prod`. Nouvelles migrations : `npx supabase db push --remote -p "$SUPABASE_DB_PASSWORD"`.
- Test e2e sur la production : `E2E_BASE_URL=https://afrikart-umber.vercel.app npm run test:e2e`.

## Structure

```
src/
  app/[locale]/        pages (hall, connexion, compte, studio, admin, visite…)
  app/auth/confirm/    retour des e-mails Supabase (confirmation, lien magique)
  config/brand.ts      lecture typée de l'identité (.env)
  i18n/                routing next-intl, chargement des messages, navigation
  lib/supabase/        clients navigateur / serveur / proxy
  lib/auth.ts          profil courant, garde de rôle côté serveur
  proxy.ts             langue + rafraîchissement de session + zones protégées
messages/              fr.json, en.json
supabase/              migrations, seed, tests
```
