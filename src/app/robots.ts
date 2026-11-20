import type { MetadataRoute } from "next";
import { settings } from "@/config/brand";

export default function robots(): MetadataRoute.Robots {
  const privatePaths = ["/studio", "/admin", "/compte", "/messages", "/connexion", "/inscription", "/borne", "/ecran", "/cartel", "/api"];
  return {
    rules: { userAgent: "*", allow: "/", disallow: [...privatePaths, ...privatePaths.map((p) => `/en${p}`)] },
    sitemap: `${settings.siteUrl}/sitemap.xml`,
  };
}
