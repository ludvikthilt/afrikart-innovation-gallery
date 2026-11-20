"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { settings } from "@/config/brand";
import { redirect } from "@/i18n/navigation";
import { isLocale, routing, type Locale } from "@/i18n/routing";
import { safeNextPath } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type AuthErrorKey =
  | "invalidEmail"
  | "passwordTooShort"
  | "displayNameRequired"
  | "invalidCredentials"
  | "emailNotConfirmed"
  | "alreadyRegistered"
  | "rateLimited"
  | "generic";

export type AuthState = {
  error?: AuthErrorKey;
  fieldErrors?: Partial<Record<"email" | "password" | "displayName", AuthErrorKey>>;
  notice?: "magicLinkSent" | "checkEmail";
  email?: string;
};

const email = z.string().trim().toLowerCase().pipe(z.email({ error: "invalidEmail" }));
const password = z.string().min(8, { error: "passwordTooShort" }).max(72);

const signInSchema = z.object({ email, password });
const signUpSchema = z.object({
  email,
  password,
  displayName: z.string().trim().min(2, { error: "displayNameRequired" }).max(80, { error: "displayNameRequired" }),
});

function readLocale(formData: FormData): Locale {
  const value = formData.get("locale");
  return isLocale(value) ? value : routing.defaultLocale;
}

function fieldErrors(error: z.ZodError): AuthState["fieldErrors"] {
  const out: AuthState["fieldErrors"] = {};
  for (const issue of error.issues) {
    const field = issue.path[0] as keyof NonNullable<AuthState["fieldErrors"]>;
    out[field] ??= issue.message as AuthErrorKey;
  }
  return out;
}

function mapSupabaseError(code: string | undefined, status: number | undefined): AuthErrorKey {
  if (code === "invalid_credentials") return "invalidCredentials";
  if (code === "email_not_confirmed") return "emailNotConfirmed";
  if (code === "user_already_exists" || code === "email_exists") return "alreadyRegistered";
  if (status === 429 || code === "over_email_send_rate_limit" || code === "over_request_rate_limit") return "rateLimited";
  return "generic";
}

/** URL de retour des e-mails (confirmation, lien magique), dans la bonne langue. */
async function callbackUrl(next: string, locale: Locale): Promise<string> {
  const origin = (await headers()).get("origin") ?? settings.siteUrl;
  const localizedNext = locale === routing.defaultLocale ? next : `/${locale}${next}`;
  return `${origin}/auth/confirm?next=${encodeURIComponent(localizedNext)}`;
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const locale = readLocale(formData);
  const parsed = signInSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), email: String(formData.get("email") ?? "") };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: mapSupabaseError(error.code, error.status), email: parsed.data.email };

  return redirect({ href: safeNextPath(formData.get("next")), locale });
}

export async function sendMagicLink(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const locale = readLocale(formData);
  const parsed = email.safeParse(formData.get("email"));
  if (!parsed.success) return { fieldErrors: { email: "invalidEmail" } };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: await callbackUrl(safeNextPath(formData.get("next")), locale),
      data: { locale },
    },
  });
  if (error) return { error: mapSupabaseError(error.code, error.status), email: parsed.data };
  return { notice: "magicLinkSent", email: parsed.data };
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const locale = readLocale(formData);
  const parsed = signUpSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    displayName: formData.get("displayName"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), email: String(formData.get("email") ?? "") };

  // « Je suis artiste » : le compte reste visiteur (règle métier), mais on
  // l'envoie directement au formulaire de demande, validé ensuite par un admin.
  const next = formData.get("profile") === "artist" ? "/compte/devenir-artiste" : "/compte";
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: await callbackUrl(next, locale),
      // Lu par le trigger handle_new_user. Le rôle, lui, est toujours « visitor ».
      data: { display_name: parsed.data.displayName, locale },
    },
  });
  if (error) return { error: mapSupabaseError(error.code, error.status), email: parsed.data.email };

  // Confirmation d'e-mail désactivée : la session existe déjà.
  if (data.session) return redirect({ href: next, locale });
  return { notice: "checkEmail", email: parsed.data.email };
}

export async function signOut(formData: FormData): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect({ href: "/", locale: readLocale(formData) });
}

// ------------------------------------------------------------ mot de passe
export type PasswordState = { ok?: boolean; error?: "passwordTooShort" | "mismatch" | "generic" };

export async function changePassword(_prev: PasswordState, formData: FormData): Promise<PasswordState> {
  const pw = String(formData.get("password") ?? "");
  if (pw.length < 8 || pw.length > 72) return { error: "passwordTooShort" };
  if (pw !== formData.get("confirm")) return { error: "mismatch" };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: pw });
  return error ? { error: "generic" } : { ok: true };
}
