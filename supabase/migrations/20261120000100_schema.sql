-- =============================================================================
-- AFRIK'ART — Schéma de base
-- Les valeurs d'enum sont en anglais (stables pour le code) ; leurs libellés
-- FR/EN sont dans messages/*.json. Les champs *_en sont des traductions
-- facultatives : à défaut, l'interface anglaise affiche le texte français.
-- =============================================================================

create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;

create type public.user_role as enum ('visitor', 'artist', 'admin');
create type public.request_status as enum ('pending', 'approved', 'rejected');
create type public.sale_status as enum ('available', 'reserved', 'sold', 'not_for_sale');
create type public.room_theme as enum ('dark', 'museum');
create type public.wall_side as enum ('north', 'east', 'south', 'west');
create type public.placement_status as enum ('proposed', 'approved', 'rejected');

-- -----------------------------------------------------------------------------
-- Utilitaires
-- -----------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Vrai quand la requête vient d'un utilisateur de l'API (et pas du
-- service_role, du seed ou d'une migration).
create or replace function public.is_api_user()
returns boolean
language sql
stable
set search_path = ''
as $$
  select current_user in ('authenticated', 'anon');
$$;

-- -----------------------------------------------------------------------------
-- Profils
-- -----------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 80),
  username text unique check (username ~ '^[a-z0-9][a-z0-9_-]{2,29}$'),
  avatar_url text,
  bio text check (char_length(bio) <= 3000),
  bio_en text check (char_length(bio_en) <= 3000),
  country text check (char_length(country) <= 80),
  city text check (char_length(city) <= 80),
  website text check (char_length(website) <= 300),
  socials jsonb not null default '{}'::jsonb,
  role public.user_role not null default 'visitor',
  preferred_locale text not null default 'fr' check (preferred_locale in ('fr', 'en')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_role_idx on public.profiles (role);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Helpers de rôle : security definer pour pouvoir être appelés dans les
-- policies RLS sans récursion sur profiles.
create or replace function public.current_role_name()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.is_artist()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select role in ('artist', 'admin') from public.profiles where id = auth.uid()), false);
$$;

-- Le rôle ne peut jamais être modifié par l'utilisateur lui-même.
create or replace function public.guard_profile_role()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.role is distinct from old.role and public.is_api_user() and not public.is_admin() then
    raise exception 'Le rôle ne peut être modifié que par un administrateur'
      using errcode = '42501';
  end if;
  if new.id = auth.uid() and new.role is distinct from old.role then
    raise exception 'Un administrateur ne peut pas modifier son propre rôle'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_role before update on public.profiles
  for each row execute function public.guard_profile_role();

-- Création automatique du profil à l'inscription (toujours « visitor »).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  base text;
  meta_name text := nullif(trim(new.raw_user_meta_data ->> 'display_name'), '');
  meta_locale text := new.raw_user_meta_data ->> 'locale';
begin
  base := lower(regexp_replace(split_part(coalesce(new.email, 'membre'), '@', 1), '[^a-zA-Z0-9]+', '-', 'g'));
  base := trim(both '-' from base);
  if char_length(base) < 3 then
    base := 'membre';
  end if;

  insert into public.profiles (id, display_name, username, preferred_locale)
  values (
    new.id,
    left(coalesce(meta_name, split_part(coalesce(new.email, ''), '@', 1)), 80),
    left(base, 24) || '-' || substr(md5(new.id::text), 1, 4),
    case when meta_locale in ('fr', 'en') then meta_locale else 'fr' end
  );
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- Demandes pour devenir artiste
-- -----------------------------------------------------------------------------

create table public.artist_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  motivation text not null check (char_length(motivation) between 20 and 3000),
  portfolio_links text[] not null default '{}',
  sample_images text[] not null default '{}'
    check (cardinality(sample_images) between 1 and 5),
  status public.request_status not null default 'pending',
  admin_note text,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index artist_requests_one_pending_idx
  on public.artist_requests (user_id) where status = 'pending';

-- Validation / refus par un admin, en une transaction.
create or replace function public.review_artist_request(
  request_id uuid,
  approve boolean,
  note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target uuid;
begin
  if not public.is_admin() then
    raise exception 'Réservé aux administrateurs' using errcode = '42501';
  end if;

  update public.artist_requests
     set status = case when approve then 'approved'::public.request_status
                       else 'rejected'::public.request_status end,
         admin_note = note,
         reviewed_by = auth.uid(),
         reviewed_at = now()
   where id = request_id and status = 'pending'
  returning user_id into target;

  if target is null then
    raise exception 'Demande introuvable ou déjà traitée' using errcode = 'P0002';
  end if;

  if approve then
    update public.profiles set role = 'artist' where id = target and role = 'visitor';
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- Collections et œuvres
-- -----------------------------------------------------------------------------

create table public.collections (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text check (char_length(description) <= 5000),
  description_en text check (char_length(description_en) <= 5000),
  cover_artwork_id uuid,
  year int check (year between 1900 and 2100),
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, artist_id)
);

create index collections_artist_idx on public.collections (artist_id);

create trigger collections_updated_at before update on public.collections
  for each row execute function public.set_updated_at();

create table public.artworks (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.profiles (id) on delete cascade,
  collection_id uuid,
  title text not null check (char_length(title) between 1 and 160),
  title_en text check (char_length(title_en) <= 160),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text check (char_length(description) <= 5000),
  description_en text check (char_length(description_en) <= 5000),
  year int check (year between 1000 and 2100),
  medium text check (char_length(medium) <= 160),
  medium_en text check (char_length(medium_en) <= 160),
  dimensions text check (char_length(dimensions) <= 80),
  -- Chemins dans le bucket « artworks » (ou URL absolue pour le seed).
  image_path text not null,
  image_medium_path text,
  image_thumb_path text,
  image_width int not null check (image_width > 0),
  image_height int not null check (image_height > 0),
  image_alt text check (char_length(image_alt) <= 300),
  dominant_color text check (dominant_color ~ '^#[0-9a-fA-F]{6}$'),
  blurhash text,
  for_sale boolean not null default false,
  price numeric(14, 2) check (price >= 0),
  currency text not null default 'XAF' check (currency ~ '^[A-Z]{3}$'),
  sale_status public.sale_status not null default 'not_for_sale',
  is_published boolean not null default false,
  is_featured boolean not null default false,
  search_vector tsvector,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Une œuvre à vendre a un prix ; une œuvre hors vente a le statut « non à vendre ».
  constraint artworks_sale_consistency check (
    (for_sale and price is not null and sale_status <> 'not_for_sale')
    or (not for_sale and sale_status = 'not_for_sale')
  ),
  -- La collection doit appartenir au même artiste.
  constraint artworks_collection_same_artist
    foreign key (collection_id, artist_id) references public.collections (id, artist_id)
    on delete set null (collection_id)
);

create index artworks_artist_idx on public.artworks (artist_id);
create index artworks_collection_idx on public.artworks (collection_id);
create index artworks_featured_idx on public.artworks (is_featured) where is_featured and is_published;
create index artworks_search_idx on public.artworks using gin (search_vector);
create index artworks_title_trgm_idx on public.artworks using gin (title extensions.gin_trgm_ops);

create trigger artworks_updated_at before update on public.artworks
  for each row execute function public.set_updated_at();

alter table public.collections
  add constraint collections_cover_fk
  foreign key (cover_artwork_id) references public.artworks (id) on delete set null;

-- Seul un admin peut mettre une œuvre en avant.
create or replace function public.guard_artwork_featured()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if public.is_api_user() and not public.is_admin()
     and new.is_featured is distinct from (case when tg_op = 'INSERT' then false else old.is_featured end) then
    raise exception 'Seul un administrateur peut mettre une œuvre en avant' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger artworks_guard_featured before insert or update on public.artworks
  for each row execute function public.guard_artwork_featured();

-- -----------------------------------------------------------------------------
-- Expositions
-- -----------------------------------------------------------------------------

create table public.exhibitions (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 160),
  title_en text check (char_length(title_en) <= 160),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  curatorial_text text check (char_length(curatorial_text) <= 8000),
  curatorial_text_en text check (char_length(curatorial_text_en) <= 8000),
  starts_at date not null,
  ends_at date not null,
  is_current boolean not null default false,
  is_published boolean not null default false,
  room_theme public.room_theme not null default 'dark',
  cover_path text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at >= starts_at),
  -- L'exposition « en cours » est forcément publiée.
  check (not is_current or is_published)
);

-- Une seule exposition en cours à la fois.
create unique index exhibitions_single_current_idx on public.exhibitions (is_current) where is_current;

create trigger exhibitions_updated_at before update on public.exhibitions
  for each row execute function public.set_updated_at();

create table public.exhibition_rooms (
  id uuid primary key default gen_random_uuid(),
  exhibition_id uuid not null references public.exhibitions (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  name_en text check (char_length(name_en) <= 120),
  position int not null default 0,
  created_at timestamptz not null default now(),
  unique (id, exhibition_id)
);

create index exhibition_rooms_expo_idx on public.exhibition_rooms (exhibition_id, position);

create table public.exhibition_artworks (
  exhibition_id uuid not null references public.exhibitions (id) on delete cascade,
  artwork_id uuid not null references public.artworks (id) on delete cascade,
  room_id uuid,
  wall public.wall_side,
  position int not null default 0,
  status public.placement_status not null default 'proposed',
  proposed_by uuid references public.profiles (id) on delete set null,
  validated_by uuid references public.profiles (id) on delete set null,
  validated_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (exhibition_id, artwork_id),
  -- La salle appartient à la même exposition.
  constraint exhibition_artworks_room_fk
    foreign key (room_id, exhibition_id) references public.exhibition_rooms (id, exhibition_id)
    on delete set null (room_id),
  -- Une œuvre placée sur un mur doit être validée.
  check (room_id is null or status = 'approved'),
  check ((room_id is null) = (wall is null))
);

create index exhibition_artworks_room_idx on public.exhibition_artworks (room_id, wall, position);
create index exhibition_artworks_artwork_idx on public.exhibition_artworks (artwork_id);

-- Seul un admin valide, refuse ou place une œuvre.
create or replace function public.guard_exhibition_artwork()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if public.is_api_user() and not public.is_admin() then
    if tg_op = 'INSERT' and (new.status <> 'proposed' or new.room_id is not null) then
      raise exception 'Une œuvre est d''abord proposée, puis validée par un administrateur'
        using errcode = '42501';
    end if;
    if tg_op = 'UPDATE' then
      raise exception 'Réservé aux administrateurs' using errcode = '42501';
    end if;
  end if;
  if tg_op = 'UPDATE' and new.status is distinct from old.status and new.status <> 'proposed' then
    new.validated_by := auth.uid();
    new.validated_at := now();
  end if;
  return new;
end;
$$;

create trigger exhibition_artworks_guard before insert or update on public.exhibition_artworks
  for each row execute function public.guard_exhibition_artwork();

-- -----------------------------------------------------------------------------
-- Social : likes et commentaires
-- -----------------------------------------------------------------------------

create table public.likes (
  user_id uuid not null references public.profiles (id) on delete cascade,
  artwork_id uuid not null references public.artworks (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, artwork_id)
);

create index likes_artwork_idx on public.likes (artwork_id);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  artwork_id uuid not null references public.artworks (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 1000),
  is_hidden boolean not null default false,
  created_at timestamptz not null default now()
);

create index comments_artwork_idx on public.comments (artwork_id, created_at desc);

-- L'auteur peut modifier son texte ; l'artiste de l'œuvre (ou un admin)
-- peut masquer le commentaire. Personne d'autre ne touche à rien.
create or replace function public.guard_comment()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  owner uuid;
begin
  if not public.is_api_user() or public.is_admin() then
    return new;
  end if;
  if new.artwork_id <> old.artwork_id or new.user_id <> old.user_id or new.created_at <> old.created_at then
    raise exception 'Champ non modifiable' using errcode = '42501';
  end if;
  if new.body is distinct from old.body and old.user_id <> auth.uid() then
    raise exception 'Seul l''auteur peut modifier son commentaire' using errcode = '42501';
  end if;
  if new.is_hidden is distinct from old.is_hidden then
    select artist_id into owner from public.artworks where id = old.artwork_id;
    if owner is distinct from auth.uid() then
      raise exception 'Seul l''artiste peut masquer un commentaire' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger comments_guard before update on public.comments
  for each row execute function public.guard_comment();

create view public.artwork_stats
with (security_invoker = true) as
select
  a.id as artwork_id,
  (select count(*) from public.likes l where l.artwork_id = a.id)::int as likes_count,
  (select count(*) from public.comments c where c.artwork_id = a.id and not c.is_hidden)::int as comments_count
from public.artworks a;

-- -----------------------------------------------------------------------------
-- Messagerie
-- -----------------------------------------------------------------------------

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.profiles (id) on delete cascade,
  visitor_id uuid not null references public.profiles (id) on delete cascade,
  artwork_id uuid references public.artworks (id) on delete set null,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  check (artist_id <> visitor_id),
  unique nulls not distinct (artist_id, visitor_id, artwork_id)
);

create index conversations_artist_idx on public.conversations (artist_id, last_message_at desc);
create index conversations_visitor_idx on public.conversations (visitor_id, last_message_at desc);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 4000),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index messages_conversation_idx on public.messages (conversation_id, created_at);

create or replace function public.is_conversation_member(conv uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.conversations c
    where c.id = conv and auth.uid() in (c.artist_id, c.visitor_id)
  );
$$;

-- Seul read_at est modifiable, et seulement par le destinataire.
create or replace function public.guard_message()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if public.is_api_user() then
    if new.body <> old.body or new.sender_id <> old.sender_id
       or new.conversation_id <> old.conversation_id or new.created_at <> old.created_at then
      raise exception 'Un message envoyé ne peut pas être modifié' using errcode = '42501';
    end if;
    if old.sender_id = auth.uid() then
      raise exception 'Seul le destinataire peut marquer un message comme lu' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger messages_guard before update on public.messages
  for each row execute function public.guard_message();

create or replace function public.touch_conversation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id;
  return new;
end;
$$;

create trigger messages_touch_conversation after insert on public.messages
  for each row execute function public.touch_conversation();
