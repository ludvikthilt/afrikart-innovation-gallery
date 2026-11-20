import { NextResponse, type NextRequest } from "next/server";
import { artworkPublicUrl, qrPng, qrSvg } from "@/lib/qr";

/**
 * QR code d'une œuvre, téléchargeable : /api/qr/<slug>?format=svg|png&download=1
 * Le QR ne contient qu'une URL publique : pas besoin de vérifier la session.
 */
export async function GET(request: NextRequest, { params }: RouteContext<"/api/qr/[slug]">) {
  const { slug } = await params;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return new NextResponse("Not found", { status: 404 });

  const format = request.nextUrl.searchParams.get("format") === "png" ? "png" : "svg";
  const disposition = request.nextUrl.searchParams.has("download") ? `attachment; filename="qr-${slug}.${format}"` : "inline";
  const headers = { "Content-Disposition": disposition, "Cache-Control": "public, max-age=86400, immutable" };
  const url = artworkPublicUrl(slug);

  if (format === "png") {
    const png = await qrPng(url);
    return new NextResponse(new Uint8Array(png), { headers: { ...headers, "Content-Type": "image/png" } });
  }
  return new NextResponse(await qrSvg(url), { headers: { ...headers, "Content-Type": "image/svg+xml" } });
}
