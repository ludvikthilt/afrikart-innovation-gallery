-- =============================================================================
-- Correctif : l'envoi des variantes d'image (upsert) exige un droit de lecture
-- sur ses propres fichiers. Sans lui, Storage refuse l'upsert (RLS) et ni les
-- œuvres ni les photos de profil ne peuvent être ajoutées.
-- =============================================================================

create policy "artworks: l'artiste lit son dossier"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'artworks'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_admin()))
  );

create policy "avatars: chacun lit le sien"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
