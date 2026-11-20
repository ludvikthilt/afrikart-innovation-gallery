import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Retour des e-mails Supabase (confirmation d'inscription, lien magique).
 * Gère les deux formats : ?code= (PKCE) et ?token_hash=&type=.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const rawNext = searchParams.get("next") ?? "/compte";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/compte";
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const supabase = await createClient();
  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : { error: new Error("missing token") };

  if (error) {
    const prefix = next.startsWith("/en/") || next === "/en" ? "/en" : "";
    return NextResponse.redirect(new URL(`${prefix}/connexion?erreur=lien`, origin));
  }
  return NextResponse.redirect(new URL(next, origin));
}
