-- =============================================================================
-- AFRIK'ART — Row Level Security
-- RLS est activé sur TOUTES les tables. Les règles métier qui portent sur une
-- colonne précise (rôle, mise en avant, validation…) sont complétées par les
-- triggers « guard_* » du schéma.
-- =============================================================================

alter table public.profiles enable row level security;
alter table public.artist_requests enable row level security;
alter table public.collections enable row level security;
alter table public.artworks enable row level security;
alter table public.exhibitions enable row level security;
alter table public.exhibition_rooms enable row level security;
alter table public.exhibition_artworks enable row level security;
alter table public.likes enable row level security;
alter table public.comments enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- Œuvre visible publiquement : publiée et appartenant à un artiste.
create or replace function public.artwork_is_public(artwork uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.artworks a
    join public.profiles p on p.id = a.artist_id
    where a.id = artwork and a.is_published and p.role in ('artist', 'admin')
  );
$$;

create or replace function public.owns_artwork(artwork uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.artworks where id = artwork and artist_id = auth.uid());
$$;

-- ---------------------------------------------------------------- profiles
create policy "profiles: lecture publique"
  on public.profiles for select
  using (true);

create policy "profiles: chacun modifie le sien, l'admin tous"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()))
  with check (id = (select auth.uid()) or (select public.is_admin()));

-- Pas d'insert (trigger d'inscription) ni de delete (cascade depuis auth.users).

-- -------------------------------------------------------- artist_requests
create policy "artist_requests: le demandeur et les admins lisent"
  on public.artist_requests for select
  to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

create policy "artist_requests: un visiteur dépose sa demande"
  on public.artist_requests for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and status = 'pending'
    and reviewed_by is null
    and (select public.current_role_name()) = 'visitor'
  );

create policy "artist_requests: le demandeur retire une demande en attente"
  on public.artist_requests for delete
  to authenticated
  using (user_id = (select auth.uid()) and status = 'pending');

-- La validation passe par la fonction review_artist_request().

-- ------------------------------------------------------------ collections
create policy "collections: publiées, ou les siennes, ou admin"
  on public.collections for select
  using (is_published or artist_id = (select auth.uid()) or (select public.is_admin()));

create policy "collections: un artiste crée les siennes"
  on public.collections for insert
  to authenticated
  with check (artist_id = (select auth.uid()) and (select public.is_artist()));

create policy "collections: le propriétaire ou un admin modifie"
  on public.collections for update
  to authenticated
  using (artist_id = (select auth.uid()) or (select public.is_admin()))
  with check (artist_id = (select auth.uid()) or (select public.is_admin()));

create policy "collections: le propriétaire ou un admin supprime"
  on public.collections for delete
  to authenticated
  using (artist_id = (select auth.uid()) or (select public.is_admin()));

-- --------------------------------------------------------------- artworks
create policy "artworks: publiques, ou les siennes, ou admin"
  on public.artworks for select
  using (
    artist_id = (select auth.uid())
    or (select public.is_admin())
    or (is_published and exists (
      select 1 from public.profiles p where p.id = artist_id and p.role in ('artist', 'admin')
    ))
  );

create policy "artworks: un artiste crée les siennes"
  on public.artworks for insert
  to authenticated
  with check (artist_id = (select auth.uid()) and (select public.is_artist()));

create policy "artworks: le propriétaire ou un admin modifie"
  on public.artworks for update
  to authenticated
  using (artist_id = (select auth.uid()) or (select public.is_admin()))
  with check (artist_id = (select auth.uid()) or (select public.is_admin()));

create policy "artworks: le propriétaire ou un admin supprime"
  on public.artworks for delete
  to authenticated
  using (artist_id = (select auth.uid()) or (select public.is_admin()));

-- ------------------------------------------------------------ exhibitions
create policy "exhibitions: publiées, ou admin"
  on public.exhibitions for select
  using (is_published or (select public.is_admin()));

create policy "exhibitions: admin écrit"
  on public.exhibitions for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- -------------------------------------------------------- exhibition_rooms
create policy "exhibition_rooms: salles des expositions visibles"
  on public.exhibition_rooms for select
  using (exists (
    select 1 from public.exhibitions e
    where e.id = exhibition_id and (e.is_published or (select public.is_admin()))
  ));

create policy "exhibition_rooms: admin écrit"
  on public.exhibition_rooms for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- ----------------------------------------------------- exhibition_artworks
create policy "exhibition_artworks: validées publiques, sinon artiste ou admin"
  on public.exhibition_artworks for select
  using (
    (select public.is_admin())
    or public.owns_artwork(artwork_id)
    or (
      status = 'approved'
      and public.artwork_is_public(artwork_id)
      and exists (select 1 from public.exhibitions e where e.id = exhibition_id and e.is_published)
    )
  );

create policy "exhibition_artworks: un artiste propose ses œuvres"
  on public.exhibition_artworks for insert
  to authenticated
  with check (
    (select public.is_admin())
    or (
      public.owns_artwork(artwork_id)
      and proposed_by = (select auth.uid())
      and status = 'proposed'
      and room_id is null
    )
  );

create policy "exhibition_artworks: admin valide et place"
  on public.exhibition_artworks for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "exhibition_artworks: l'artiste retire une proposition, l'admin tout"
  on public.exhibition_artworks for delete
  to authenticated
  using (
    (select public.is_admin())
    or (public.owns_artwork(artwork_id) and status = 'proposed')
  );

-- ------------------------------------------------------------------ likes
create policy "likes: lecture publique"
  on public.likes for select
  using (true);

create policy "likes: un inscrit like une œuvre publique"
  on public.likes for insert
  to authenticated
  with check (user_id = (select auth.uid()) and public.artwork_is_public(artwork_id));

create policy "likes: on retire son like"
  on public.likes for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- --------------------------------------------------------------- comments
create policy "comments: visibles, ou les siens, ou ceux de ses œuvres"
  on public.comments for select
  using (
    (not is_hidden and public.artwork_is_public(artwork_id))
    or user_id = (select auth.uid())
    or public.owns_artwork(artwork_id)
    or (select public.is_admin())
  );

create policy "comments: un inscrit commente une œuvre publique"
  on public.comments for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and is_hidden = false
    and public.artwork_is_public(artwork_id)
  );

create policy "comments: auteur, artiste de l'œuvre ou admin modifient"
  on public.comments for update
  to authenticated
  using (
    user_id = (select auth.uid())
    or public.owns_artwork(artwork_id)
    or (select public.is_admin())
  );

create policy "comments: l'auteur ou un admin supprime"
  on public.comments for delete
  to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

-- ---------------------------------------------------------- conversations
create policy "conversations: les participants lisent"
  on public.conversations for select
  to authenticated
  using ((select auth.uid()) in (artist_id, visitor_id) or (select public.is_admin()));

create policy "conversations: un inscrit contacte un artiste"
  on public.conversations for insert
  to authenticated
  with check (
    visitor_id = (select auth.uid())
    and exists (select 1 from public.profiles p where p.id = artist_id and p.role in ('artist', 'admin'))
    and (artwork_id is null or exists (
      select 1 from public.artworks a where a.id = artwork_id and a.artist_id = conversations.artist_id
    ))
  );

-- --------------------------------------------------------------- messages
create policy "messages: les participants lisent"
  on public.messages for select
  to authenticated
  using (public.is_conversation_member(conversation_id) or (select public.is_admin()));

create policy "messages: un participant écrit en son nom"
  on public.messages for insert
  to authenticated
  with check (
    sender_id = (select auth.uid())
    and read_at is null
    and public.is_conversation_member(conversation_id)
  );

create policy "messages: le destinataire marque comme lu"
  on public.messages for update
  to authenticated
  using (public.is_conversation_member(conversation_id))
  with check (public.is_conversation_member(conversation_id));

-- Temps réel pour la messagerie.
alter publication supabase_realtime add table public.messages;
