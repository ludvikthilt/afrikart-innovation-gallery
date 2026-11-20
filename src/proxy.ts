import createIntlMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { isLocale, routing } from "@/i18n/routing";
import { refreshSession } from "@/lib/supabase/proxy";

const handleI18n = createIntlMiddleware(routing);

// Zones réservées : vérification optimiste ici (connecté ou non),
// le rôle est revérifié côté serveur dans chaque layout (requireRole).
const PROTECTED = ["/studio", "/admin", "/compte", "/messages"];

function stripLocale(pathname: string): string {
  const [, first, ...rest] = pathname.split("/");
  return isLocale(first) ? `/${rest.join("/")}` : pathname;
}

export async function proxy(request: NextRequest) {
  const response = handleI18n(request);
  const userId = await refreshSession(request, response);

  const path = stripLocale(request.nextUrl.pathname);
  const isProtected = PROTECTED.some((p) => path === p || path.startsWith(`${p}/`));

  if (isProtected && !userId) {
    const locale = request.nextUrl.pathname.split("/")[1];
    const prefix = isLocale(locale) && locale !== routing.defaultLocale ? `/${locale}` : "";
    const url = request.nextUrl.clone();
    url.pathname = `${prefix}/connexion`;
    url.search = `?next=${encodeURIComponent(path)}`;
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }

  return response;
}

export const config = {
  // Tout sauf les routes API, l'auth Supabase, les fichiers internes et statiques.
  matcher: ["/((?!api|auth|_next|_vercel|.*\\..*).*)"],
};
