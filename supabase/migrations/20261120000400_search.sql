-- =============================================================================
-- AFRIK'ART — Recherche (plein texte + tolérance aux fautes)
-- Config « simple » + unaccent : la galerie est bilingue, on évite de
-- raciner en français des titres anglais (et inversement).
-- =============================================================================

create or replace function public.immutable_unaccent(value text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(value, ''));
$$;

create or replace function public.artwork_search_vector(artwork public.artworks)
returns tsvector
language sql
stable
security definer
set search_path = ''
as $$
  select
    setweight(to_tsvector('simple', public.immutable_unaccent(artwork.title || ' ' || coalesce(artwork.title_en, ''))), 'A')
    || setweight(to_tsvector('simple', public.immutable_unaccent(
         coalesce((select display_name from public.profiles where id = artwork.artist_id), ''))), 'A')
    || setweight(to_tsvector('simple', public.immutable_unaccent(
         coalesce(artwork.medium, '') || ' ' || coalesce(artwork.medium_en, ''))), 'B')
    || setweight(to_tsvector('simple', public.immutable_unaccent(
         coalesce(artwork.description, '') || ' ' || coalesce(artwork.description_en, ''))), 'C');
$$;

create or replace function public.artworks_refresh_search()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.search_vector := public.artwork_search_vector(new);
  return new;
end;
$$;

create trigger artworks_search before insert or update of title, title_en, medium, medium_en, description, description_en, artist_id
  on public.artworks
  for each row execute function public.artworks_refresh_search();

-- Le nom de l'artiste fait partie de l'index de ses œuvres.
create or replace function public.profiles_refresh_artwork_search()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.display_name is distinct from old.display_name then
    update public.artworks a set search_vector = public.artwork_search_vector(a) where a.artist_id = new.id;
  end if;
  return new;
end;
$$;

create trigger profiles_refresh_artwork_search after update of display_name on public.profiles
  for each row execute function public.profiles_refresh_artwork_search();

create index profiles_name_trgm_idx on public.profiles
  using gin (public.immutable_unaccent(display_name) extensions.gin_trgm_ops);
create index collections_title_trgm_idx on public.collections
  using gin (public.immutable_unaccent(title) extensions.gin_trgm_ops);

-- Une seule RPC pour la palette de recherche. security invoker : la RLS
-- s'applique, un visiteur ne voit que ce qui est publié.
create or replace function public.search_gallery(q text, max_results int default 8)
returns table (
  kind text,
  id uuid,
  slug text,
  title text,
  subtitle text,
  image_path text,
  exhibition_slug text,
  room_position int,
  score real
)
language sql
stable
security invoker
set search_path = ''
as $$
  with query as (
    select
      public.immutable_unaccent(lower(trim(q))) as term,
      websearch_to_tsquery('simple', public.immutable_unaccent(trim(q))) as tsq
  ),
  current_placements as (
    select ea.artwork_id, e.slug as exhibition_slug, r.position as room_position
    from public.exhibition_artworks ea
    join public.exhibitions e on e.id = ea.exhibition_id and e.is_current
    join public.exhibition_rooms r on r.id = ea.room_id
    where ea.status = 'approved'
  ),
  artists as (
    select 'artist'::text as kind, p.id, p.username as slug, p.display_name as title,
           concat_ws(', ', p.city, p.country) as subtitle, p.avatar_url as image_path,
           null::text as exhibition_slug, null::int as room_position,
           extensions.similarity(public.immutable_unaccent(lower(p.display_name)), query.term) as score
    from public.profiles p, query
    where p.role in ('artist', 'admin')
      and p.username is not null
      and (public.immutable_unaccent(lower(p.display_name)) operator(extensions.%) query.term
           or public.immutable_unaccent(lower(p.display_name)) like '%' || query.term || '%')
    order by score desc
    limit max_results
  ),
  works as (
    select 'artwork'::text as kind, a.id, a.slug, a.title,
           (select display_name from public.profiles where id = a.artist_id) as subtitle,
           coalesce(a.image_thumb_path, a.image_path) as image_path,
           cp.exhibition_slug, cp.room_position,
           greatest(
             ts_rank(a.search_vector, query.tsq),
             extensions.similarity(public.immutable_unaccent(lower(a.title)), query.term)
           ) as score
    from public.artworks a
    cross join query
    left join current_placements cp on cp.artwork_id = a.id
    where a.is_published
      and (a.search_vector @@ query.tsq
           or public.immutable_unaccent(lower(a.title)) operator(extensions.%) query.term
           or public.immutable_unaccent(lower(a.title)) like '%' || query.term || '%')
    order by score desc
    limit max_results
  ),
  cols as (
    select 'collection'::text as kind, c.id, c.slug, c.title,
           (select display_name from public.profiles where id = c.artist_id) as subtitle,
           (select coalesce(a.image_thumb_path, a.image_path) from public.artworks a where a.id = c.cover_artwork_id) as image_path,
           null::text, null::int,
           extensions.similarity(public.immutable_unaccent(lower(c.title)), query.term) as score
    from public.collections c, query
    where c.is_published
      and (public.immutable_unaccent(lower(c.title)) operator(extensions.%) query.term
           or public.immutable_unaccent(lower(c.title)) like '%' || query.term || '%')
    order by score desc
    limit max_results
  )
  select * from artists
  union all select * from works
  union all select * from cols;
$$;

grant execute on function public.search_gallery(text, int) to anon, authenticated;
