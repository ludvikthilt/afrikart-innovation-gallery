import type { RoomTheme, SaleStatus, WallSide } from "@/types/database";

/** Données d'une œuvre nécessaires à la visite (salle, focus, panneau). */
export type VisitArtwork = {
  id: string;
  slug: string;
  title: string;
  title_en: string | null;
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
  for_sale: boolean;
  price: number | null;
  currency: string;
  sale_status: SaleStatus;
  artist: { id: string; display_name: string; username: string | null; avatar_url: string | null };
  collection: { title: string; slug: string } | null;
};

export type VisitWall = { side: WallSide; artworks: VisitArtwork[] };

export type VisitRoom = { id: string; name: string; name_en: string | null; walls: VisitWall[] };

export type VisitExhibition = {
  id: string;
  slug: string;
  title: string;
  title_en: string | null;
  room_theme: RoomTheme;
  rooms: VisitRoom[];
};

export type ArtworkStats = { likes: number; comments: number; liked: boolean };

export type Viewer = { id: string; role: "visitor" | "artist" | "admin" } | null;

/** Conversion indicative d'un prix en XAF. */
export type Rates = { eur: number; usd: number; source: string; date: string };
