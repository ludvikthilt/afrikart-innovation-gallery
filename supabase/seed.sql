-- =============================================================================
-- AFRIK'ART — Données de démonstration (développement local uniquement)
-- Comptes : mot de passe « Afrikart2026! » pour tous.
--   admin@afrikart.test   (admin)
--   aicha@afrikart.test   koffi@afrikart.test   carla@afrikart.test   (artistes)
--   visiteur@afrikart.test (visiteur)
-- Images : placeholders Lorem Picsum, voir SEED_SOURCES.md.
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;

-- --------------------------------------------------------------- comptes
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
)
select
  '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
  extensions.crypt('Afrikart2026!', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('display_name', u.display_name, 'locale', 'fr'),
  now(), now(), '', '', '', ''
from (values
  ('a0000000-0000-4000-8000-000000000001'::uuid, 'admin@afrikart.test', 'Équipe AFRIK''ART'),
  ('a0000000-0000-4000-8000-000000000002'::uuid, 'aicha@afrikart.test', 'Aïcha Mbarga'),
  ('a0000000-0000-4000-8000-000000000003'::uuid, 'koffi@afrikart.test', 'Koffi Mensah'),
  ('a0000000-0000-4000-8000-000000000004'::uuid, 'carla@afrikart.test', 'Carla Dossou'),
  ('a0000000-0000-4000-8000-000000000005'::uuid, 'visiteur@afrikart.test', 'Jeanne Visiteuse')
) as u (id, email, display_name);

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id, u.id::text,
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
       'email', now(), now(), now()
from auth.users u
where u.email like '%@afrikart.test';

-- Les profils ont été créés par le trigger ; on complète.
update public.profiles set role = 'admin', username = 'afrikart'
  where id = 'a0000000-0000-4000-8000-000000000001';

update public.profiles set
  role = 'artist', username = 'aicha-mbarga', city = 'Douala', country = 'Cameroun',
  bio = 'Peintre. Aïcha Mbarga explore les mythologies fluviales du Cameroun à travers des toiles en relief où l''acrylique dialogue avec le sable et les pigments naturels.',
  bio_en = 'Painter. Aïcha Mbarga explores the river mythologies of Cameroon through textured canvases where acrylic meets sand and natural pigments.',
  socials = '{"instagram":"https://instagram.com/"}'
  where id = 'a0000000-0000-4000-8000-000000000002';

update public.profiles set
  role = 'artist', username = 'koffi-mensah', city = 'Lomé', country = 'Togo',
  bio = 'Sculpteur et laqueur. Ses masques contemporains réinterprètent les formes rituelles avec des matériaux d''aujourd''hui.',
  bio_en = 'Sculptor and lacquer artist. His contemporary masks reinterpret ritual forms with today''s materials.'
  where id = 'a0000000-0000-4000-8000-000000000003';

update public.profiles set
  role = 'artist', username = 'carla-dossou', city = 'Cotonou', country = 'Bénin',
  bio = 'Artiste numérique et peintre. Carla Dossou compose des paysages oniriques entre feuille d''or et techniques mixtes.',
  bio_en = 'Digital artist and painter. Carla Dossou composes dreamlike landscapes between gold leaf and mixed media.'
  where id = 'a0000000-0000-4000-8000-000000000004';

update public.profiles set username = 'jeanne-v'
  where id = 'a0000000-0000-4000-8000-000000000005';

-- ----------------------------------------------------------- collections
insert into public.collections (id, artist_id, title, slug, description, description_en, year, is_published) values
  ('c0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002',
   'Eaux sacrées', 'eaux-sacrees',
   'Une série sur les esprits du fleuve Wouri et les gardiens des rives.',
   'A series on the spirits of the Wouri river and the guardians of its banks.', 2025, true),
  ('c0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000004',
   'Villes vivantes', 'villes-vivantes',
   'Cotonou, Lagos, Dakar : la ville comme organisme lumineux.',
   'Cotonou, Lagos, Dakar: the city as a luminous organism.', 2026, true);

-- --------------------------------------------------------------- œuvres
-- (slug, artiste, collection, titre, titre_en, année, technique, technique_en, dimensions,
--  largeur, hauteur, couleur, à vendre, prix, statut, en avant, description, description_en)
insert into public.artworks (
  id, slug, artist_id, collection_id, title, title_en, year, medium, medium_en, dimensions,
  image_path, image_medium_path, image_thumb_path, image_width, image_height, dominant_color,
  for_sale, price, sale_status, is_published, is_featured, description, description_en, image_alt
)
select
  w.id, w.slug, w.artist_id, w.collection_id, w.title, w.title_en, w.year, w.medium, w.medium_en, w.dimensions,
  format('https://picsum.photos/seed/%s/%s/%s', w.slug, w.width, w.height),
  format('https://picsum.photos/seed/%s/%s/%s', w.slug, round(w.width * 1600.0 / greatest(w.width, w.height)), round(w.height * 1600.0 / greatest(w.width, w.height))),
  format('https://picsum.photos/seed/%s/%s/%s', w.slug, round(w.width * 400.0 / greatest(w.width, w.height)), round(w.height * 400.0 / greatest(w.width, w.height))),
  w.width, w.height, w.color,
  w.for_sale, w.price, w.sale_status::public.sale_status, true, w.featured, w.description, w.description_en,
  w.title || ' — ' || w.medium
from (values
  ('b0000000-0000-4000-8000-000000000001'::uuid, 'le-gardien-du-fleuve', 'a0000000-0000-4000-8000-000000000002'::uuid, 'c0000000-0000-4000-8000-000000000001'::uuid,
   'Le Gardien du fleuve', 'The River Keeper', 2025, 'Acrylique et relief sur toile', 'Acrylic and relief on canvas', '120 × 90 cm',
   1800, 2400, '#B5452E', true, 450000::numeric, 'available', true,
   'Un visage double veille sur le Wouri. Le relief de sable capte la lumière rasante et change au fil de la journée.',
   'A double face watches over the Wouri. The sand relief catches the raking light and shifts throughout the day.'),
  ('b0000000-0000-4000-8000-000000000002', 'les-rives-du-wouri', 'a0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000001',
   'Les Rives du Wouri', 'Banks of the Wouri', 2025, 'Acrylique et pigments naturels', 'Acrylic and natural pigments', '150 × 100 cm',
   2400, 1600, '#2F5D62', true, 380000, 'available', false,
   'Les pêcheurs à l''aube, réduits à des silhouettes d''ocre sur l''eau d''encre.',
   'Fishermen at dawn, reduced to ochre silhouettes on ink-dark water.'),
  ('b0000000-0000-4000-8000-000000000003', 'mami-wata', 'a0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000001',
   'Mami Wata', null, 2024, 'Technique mixte sur toile', 'Mixed media on canvas', '100 × 100 cm',
   2000, 2000, '#1F4E79', true, 520000, 'reserved', false,
   'La divinité des eaux, entre séduction et menace, peinte en bleus profonds.',
   'The water deity, between seduction and threat, painted in deep blues.'),
  ('b0000000-0000-4000-8000-000000000004', 'masque-des-veilleurs', 'a0000000-0000-4000-8000-000000000003', null,
   'Masque des Veilleurs', 'Mask of the Watchers', 2024, 'Sculpture et laque contemporaine', 'Sculpture and contemporary lacquer', '60 × 40 × 25 cm',
   1600, 2200, '#3B2A1E', true, 620000, 'reserved', true,
   'Un masque de passage, laqué de rouge et de noir, qui regarde à la fois vers les ancêtres et vers la ville.',
   'A passage mask, lacquered red and black, looking both towards the ancestors and the city.'),
  ('b0000000-0000-4000-8000-000000000005', 'l-esprit-des-origines', 'a0000000-0000-4000-8000-000000000003', null,
   'L''Esprit des Origines', 'Spirit of Origins', 2025, 'Bois sculpté et pigments', 'Carved wood and pigments', '80 × 35 cm',
   1500, 2400, '#6B4226', false, null, 'not_for_sale', false,
   'Pièce de collection personnelle de l''artiste, présentée pour la première fois.',
   'From the artist''s personal collection, shown for the first time.'),
  ('b0000000-0000-4000-8000-000000000006', 'veilleur-de-nuit', 'a0000000-0000-4000-8000-000000000003', null,
   'Veilleur de nuit', 'Night Watcher', 2026, 'Laque sur bois', 'Lacquer on wood', '50 × 50 cm',
   1800, 1800, '#1A1A1A', true, 290000, 'available', false,
   'Un masque presque entièrement noir : la lumière ne révèle que les arêtes.',
   'An almost entirely black mask: light reveals only the edges.'),
  ('b0000000-0000-4000-8000-000000000007', 'elevation-crepusculaire', 'a0000000-0000-4000-8000-000000000004', null,
   'Élévation crépusculaire', 'Twilight Elevation', 2025, 'Technique mixte et feuille d''or', 'Mixed media and gold leaf', '130 × 97 cm',
   1800, 2400, '#C9A227', true, 780000, 'available', true,
   'Un croissant d''or au-dessus d''îles suspendues : le moment où le jour hésite.',
   'A golden crescent over floating islands: the moment the day hesitates.'),
  ('b0000000-0000-4000-8000-000000000008', 'resonance-solaire', 'a0000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-000000000002',
   'Résonance solaire', 'Solar Resonance', 2026, 'Pigments naturels sur lin', 'Natural pigments on linen', '200 × 150 cm',
   2400, 1800, '#C2571A', true, 520000, 'available', true,
   'Le soleil comme horloge de la ville : chaque toit renvoie sa propre lumière.',
   'The sun as the city''s clock: every roof sends back its own light.'),
  ('b0000000-0000-4000-8000-000000000009', 'marche-dantokpa', 'a0000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-000000000002',
   'Marché Dantokpa', 'Dantokpa Market', 2026, 'Acrylique sur toile', 'Acrylic on canvas', '160 × 90 cm',
   2560, 1440, '#D98E04', true, 410000, 'sold', false,
   'Le plus grand marché d''Afrique de l''Ouest, vu comme une partition de couleurs.',
   'West Africa''s largest market, seen as a score of colours.'),
  ('b0000000-0000-4000-8000-000000000010', 'lagos-3h', 'a0000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-000000000002',
   'Lagos, 3 h du matin', 'Lagos, 3 a.m.', 2026, 'Peinture numérique, tirage pigmentaire', 'Digital painting, pigment print', '70 × 100 cm',
   1680, 2400, '#283655', true, 180000, 'available', false,
   'La ville qui ne dort jamais, tirée en édition limitée à 10 exemplaires.',
   'The city that never sleeps, printed in a limited edition of 10.'),
  ('b0000000-0000-4000-8000-000000000011', 'la-tisseuse', 'a0000000-0000-4000-8000-000000000002', null,
   'La Tisseuse', 'The Weaver', 2026, 'Acrylique sur toile de jute', 'Acrylic on burlap', '90 × 120 cm',
   2400, 1800, '#8C5A3C', true, 350000, 'available', false,
   'Hommage aux tisserandes de Foumban et à la patience du geste répété.',
   'A tribute to the weavers of Foumban and the patience of the repeated gesture.'),
  ('b0000000-0000-4000-8000-000000000012', 'chef-bamileke', 'a0000000-0000-4000-8000-000000000003', null,
   'Chef bamiléké', 'Bamileke Chief', 2025, 'Perles et bois', 'Beads and wood', '70 × 45 cm',
   1600, 2400, '#7A1F2B', true, 480000, 'available', false,
   'Une figure de chef couverte de perles, en écho aux trônes de l''Ouest Cameroun.',
   'A beaded chief figure, echoing the thrones of West Cameroon.')
) as w (id, slug, artist_id, collection_id, title, title_en, year, medium, medium_en, dimensions,
        width, height, color, for_sale, price, sale_status, featured, description, description_en);

update public.collections set cover_artwork_id = 'b0000000-0000-4000-8000-000000000001' where slug = 'eaux-sacrees';
update public.collections set cover_artwork_id = 'b0000000-0000-4000-8000-000000000008' where slug = 'villes-vivantes';

-- ------------------------------------------------------------- exposition
insert into public.exhibitions (
  id, title, title_en, slug, curatorial_text, curatorial_text_en,
  starts_at, ends_at, is_current, is_published, room_theme, created_by
) values (
  'e0000000-0000-4000-8000-000000000001',
  'Lumières d''Afrique', 'Lights of Africa', 'lumieres-d-afrique',
  'Une traversée contemplative des formes contemporaines et des mythologies vivantes du continent.',
  'A contemplative journey through the contemporary forms and living mythologies of the continent.',
  '2026-11-23', '2026-11-27', true, true, 'dark', 'a0000000-0000-4000-8000-000000000001'
);

insert into public.exhibition_rooms (id, exhibition_id, name, name_en, position) values
  ('d0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001', 'Portraits et gardiens', 'Portraits and guardians', 1),
  ('d0000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000001', 'Villes vivantes', 'Living cities', 2);

insert into public.exhibition_artworks (exhibition_id, artwork_id, room_id, wall, position, status, proposed_by, validated_by, validated_at)
select 'e0000000-0000-4000-8000-000000000001', p.artwork_id, p.room_id, p.wall::public.wall_side, p.position, 'approved',
       a.artist_id, 'a0000000-0000-4000-8000-000000000001', now()
from (values
  ('b0000000-0000-4000-8000-000000000001'::uuid, 'd0000000-0000-4000-8000-000000000001'::uuid, 'north', 1),
  ('b0000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000001', 'north', 2),
  ('b0000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000001', 'east', 1),
  ('b0000000-0000-4000-8000-000000000012', 'd0000000-0000-4000-8000-000000000001', 'east', 2),
  ('b0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000001', 'south', 1),
  ('b0000000-0000-4000-8000-000000000005', 'd0000000-0000-4000-8000-000000000001', 'west', 1),
  ('b0000000-0000-4000-8000-000000000011', 'd0000000-0000-4000-8000-000000000001', 'west', 2),
  ('b0000000-0000-4000-8000-000000000008', 'd0000000-0000-4000-8000-000000000002', 'north', 1),
  ('b0000000-0000-4000-8000-000000000007', 'd0000000-0000-4000-8000-000000000002', 'north', 2),
  ('b0000000-0000-4000-8000-000000000009', 'd0000000-0000-4000-8000-000000000002', 'east', 1),
  ('b0000000-0000-4000-8000-000000000010', 'd0000000-0000-4000-8000-000000000002', 'south', 1)
) as p (artwork_id, room_id, wall, position)
join public.artworks a on a.id = p.artwork_id;

-- Une proposition en attente, pour l'écran de validation admin.
insert into public.exhibition_artworks (exhibition_id, artwork_id, status, proposed_by)
values ('e0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000006', 'proposed', 'a0000000-0000-4000-8000-000000000003');

-- ------------------------------------------------------------------ social
insert into public.likes (user_id, artwork_id) values
  ('a0000000-0000-4000-8000-000000000005', 'b0000000-0000-4000-8000-000000000001'),
  ('a0000000-0000-4000-8000-000000000005', 'b0000000-0000-4000-8000-000000000007'),
  ('a0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000001');

insert into public.comments (artwork_id, user_id, body) values
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000005', 'Le relief est saisissant, on a envie de toucher la toile.'),
  ('b0000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000003', 'Magnifique travail sur la feuille d''or.');

-- Une demande d'artiste en attente.
insert into public.artist_requests (user_id, motivation, portfolio_links, sample_images) values
  ('a0000000-0000-4000-8000-000000000005',
   'Photographe depuis cinq ans, je souhaite exposer ma série sur les marchés de Dschang.',
   array['https://example.com/portfolio'], array['a0000000-0000-4000-8000-000000000005/exemple-1.jpg']);
