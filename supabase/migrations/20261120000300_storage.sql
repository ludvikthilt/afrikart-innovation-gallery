-- =============================================================================
-- AFRIK'ART — Stockage
-- Convention de chemin : {bucket}/{user_id}/... (le premier dossier = propriétaire)
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('artworks', 'artworks', true, 20971520, array['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('exhibitions', 'exhibitions', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('artist-requests', 'artist-requests', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Les buckets publics sont lisibles par URL publique sans policy de lecture.
-- Les chemins contiennent des UUID : une œuvre non publiée n'est pas listable.

-- ------------------------------------------------------------------ artworks
create policy "artworks: l'artiste dépose dans son dossier"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'artworks'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select public.is_artist())
  );

create policy "artworks: l'artiste modifie ses fichiers"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'artworks' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "artworks: l'artiste ou un admin supprime"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'artworks'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_admin()))
  );

-- ------------------------------------------------------------------- avatars
create policy "avatars: chacun dépose le sien"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "avatars: chacun modifie le sien"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "avatars: chacun supprime le sien"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- --------------------------------------------------------------- exhibitions
create policy "exhibitions: admin écrit"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'exhibitions' and (select public.is_admin()))
  with check (bucket_id = 'exhibitions' and (select public.is_admin()));

-- ----------------------------------------------------------- artist-requests
create policy "artist-requests: le demandeur et les admins lisent"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'artist-requests'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_admin()))
  );

create policy "artist-requests: le demandeur dépose"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'artist-requests' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "artist-requests: le demandeur supprime"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'artist-requests' and (storage.foldername(name))[1] = (select auth.uid())::text);
