import { NextResponse, type NextRequest } from "next/server";
import { searchGallery } from "@/lib/data/search";

// Résultats instantanés de la palette de recherche (RLS appliquée).
export async function GET(request: NextRequest) {
  const results = await searchGallery(request.nextUrl.searchParams.get("q") ?? "");
  return NextResponse.json(results, { headers: { "Cache-Control": "private, max-age=30" } });
}
