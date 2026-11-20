/**
 * Types de la base, écrits à la main d'après supabase/migrations.
 * À remplacer par la version générée dès qu'une base tourne :
 *   npm run db:types        (base locale, `supabase start`)
 * Le format est compatible avec celui de `supabase gen types typescript`.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type UserRole = "visitor" | "artist" | "admin";
export type RequestStatus = "pending" | "approved" | "rejected";
export type SaleStatus = "available" | "reserved" | "sold" | "not_for_sale";
export type RoomTheme = "dark" | "museum";
export type WallSide = "north" | "east" | "south" | "west";
export type PlacementStatus = "proposed" | "approved" | "rejected";

type Rel<Fk extends string, Cols extends string[], Ref extends string> = {
  foreignKeyName: Fk;
  columns: Cols;
  isOneToOne: false;
  referencedRelation: Ref;
  referencedColumns: ["id"];
};

/** Insert : colonnes obligatoires + le reste facultatif. Update : tout facultatif. */
type Table<Row, Required extends keyof Row, Relationships extends Rel<string, string[], string>[] = []> = {
  Row: Row;
  Insert: Pick<Row, Required> & Partial<Omit<Row, Required>>;
  Update: Partial<Row>;
  Relationships: Relationships;
};

export type ProfileRow = {
  id: string;
  display_name: string;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  bio_en: string | null;
  country: string | null;
  city: string | null;
  website: string | null;
  socials: Json;
  role: UserRole;
  preferred_locale: "fr" | "en";
  created_at: string;
  updated_at: string;
};

export type ArtistRequestRow = {
  id: string;
  user_id: string;
  motivation: string;
  portfolio_links: string[];
  sample_images: string[];
  status: RequestStatus;
  admin_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
};

export type CollectionRow = {
  id: string;
  artist_id: string;
  title: string;
  slug: string;
  description: string | null;
  description_en: string | null;
  cover_artwork_id: string | null;
  year: number | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

export type ArtworkRow = {
  id: string;
  artist_id: string;
  collection_id: string | null;
  title: string;
  title_en: string | null;
  slug: string;
  description: string | null;
  description_en: string | null;
  year: number | null;
  medium: string | null;
  medium_en: string | null;
  dimensions: string | null;
  image_path: string;
  image_medium_path: string | null;
  image_thumb_path: string | null;
  image_width: number;
  image_height: number;
  image_alt: string | null;
  dominant_color: string | null;
  blurhash: string | null;
  for_sale: boolean;
  price: number | null;
  currency: string;
  sale_status: SaleStatus;
  is_published: boolean;
  is_featured: boolean;
  search_vector: unknown;
  created_at: string;
  updated_at: string;
};

export type ExhibitionRow = {
  id: string;
  title: string;
  title_en: string | null;
  slug: string;
  curatorial_text: string | null;
  curatorial_text_en: string | null;
  starts_at: string;
  ends_at: string;
  is_current: boolean;
  is_published: boolean;
  room_theme: RoomTheme;
  cover_path: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ExhibitionRoomRow = {
  id: string;
  exhibition_id: string;
  name: string;
  name_en: string | null;
  position: number;
  created_at: string;
};

export type ExhibitionArtworkRow = {
  exhibition_id: string;
  artwork_id: string;
  room_id: string | null;
  wall: WallSide | null;
  position: number;
  status: PlacementStatus;
  proposed_by: string | null;
  validated_by: string | null;
  validated_at: string | null;
  created_at: string;
};

export type LikeRow = { user_id: string; artwork_id: string; created_at: string };

export type CommentRow = {
  id: string;
  artwork_id: string;
  user_id: string;
  body: string;
  is_hidden: boolean;
  created_at: string;
};

export type ConversationRow = {
  id: string;
  artist_id: string;
  visitor_id: string;
  artwork_id: string | null;
  created_at: string;
  last_message_at: string;
};

export type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

export type SearchResult = {
  kind: "artist" | "artwork" | "collection";
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  image_path: string | null;
  exhibition_slug: string | null;
  room_position: number | null;
  score: number;
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<ProfileRow, "id">;
      artist_requests: Table<
        ArtistRequestRow,
        "user_id" | "motivation",
        [Rel<"artist_requests_user_id_fkey", ["user_id"], "profiles">]
      >;
      collections: Table<
        CollectionRow,
        "artist_id" | "title" | "slug",
        [Rel<"collections_artist_id_fkey", ["artist_id"], "profiles">]
      >;
      artworks: Table<
        ArtworkRow,
        "artist_id" | "title" | "slug" | "image_path" | "image_width" | "image_height",
        [
          Rel<"artworks_artist_id_fkey", ["artist_id"], "profiles">,
          Rel<"artworks_collection_same_artist", ["collection_id", "artist_id"], "collections">,
        ]
      >;
      exhibitions: Table<ExhibitionRow, "title" | "slug" | "starts_at" | "ends_at">;
      exhibition_rooms: Table<
        ExhibitionRoomRow,
        "exhibition_id" | "name",
        [Rel<"exhibition_rooms_exhibition_id_fkey", ["exhibition_id"], "exhibitions">]
      >;
      exhibition_artworks: Table<
        ExhibitionArtworkRow,
        "exhibition_id" | "artwork_id",
        [
          Rel<"exhibition_artworks_artwork_id_fkey", ["artwork_id"], "artworks">,
          Rel<"exhibition_artworks_exhibition_id_fkey", ["exhibition_id"], "exhibitions">,
          Rel<"exhibition_artworks_room_fk", ["room_id", "exhibition_id"], "exhibition_rooms">,
        ]
      >;
      likes: Table<LikeRow, "user_id" | "artwork_id">;
      comments: Table<
        CommentRow,
        "artwork_id" | "user_id" | "body",
        [
          Rel<"comments_user_id_fkey", ["user_id"], "profiles">,
          Rel<"comments_artwork_id_fkey", ["artwork_id"], "artworks">,
        ]
      >;
      conversations: Table<
        ConversationRow,
        "artist_id" | "visitor_id",
        [
          Rel<"conversations_artist_id_fkey", ["artist_id"], "profiles">,
          Rel<"conversations_visitor_id_fkey", ["visitor_id"], "profiles">,
          Rel<"conversations_artwork_id_fkey", ["artwork_id"], "artworks">,
        ]
      >;
      messages: Table<
        MessageRow,
        "conversation_id" | "sender_id" | "body",
        [Rel<"messages_conversation_id_fkey", ["conversation_id"], "conversations">]
      >;
    };
    Views: {
      artwork_stats: {
        Row: { artwork_id: string; likes_count: number; comments_count: number };
        Relationships: [];
      };
    };
    Functions: {
      search_gallery: { Args: { q: string; max_results?: number }; Returns: SearchResult[] };
      review_artist_request: { Args: { request_id: string; approve: boolean; note?: string }; Returns: undefined };
      is_admin: { Args: Record<string, never>; Returns: boolean };
      is_artist: { Args: Record<string, never>; Returns: boolean };
    };
    Enums: {
      user_role: UserRole;
      request_status: RequestStatus;
      sale_status: SaleStatus;
      room_theme: RoomTheme;
      wall_side: WallSide;
      placement_status: PlacementStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
