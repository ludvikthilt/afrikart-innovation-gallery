import "server-only";
import QRCode from "qrcode";
import { settings } from "@/config/brand";

/** URL encodée dans le QR d'une œuvre : sans préfixe de langue, stable. */
export const artworkPublicUrl = (slug: string) => `${settings.siteUrl}/oeuvres/${slug}`;

const OPTIONS = { errorCorrectionLevel: "M" as const, margin: 1, color: { dark: "#1c1c1e", light: "#ffffff00" } };

export function qrSvg(url: string): Promise<string> {
  return QRCode.toString(url, { ...OPTIONS, type: "svg" });
}

export function qrPng(url: string, width = 1024): Promise<Buffer> {
  return QRCode.toBuffer(url, { ...OPTIONS, type: "png", width, color: { dark: "#1c1c1e", light: "#ffffff" } });
}
