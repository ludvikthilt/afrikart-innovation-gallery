import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { signOut } from "@/actions/auth";
import { AvatarUpload } from "@/components/account/avatar-upload";
import { PasswordForm } from "@/components/account/password-form";
import { ProfileForm } from "@/components/account/profile-form";
import { LogOutIcon } from "@/components/ui/icons";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({ params }: PageProps<"/[locale]/compte">): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale as Locale, namespace: "account" });
  return { title: t("title"), robots: { index: false } };
}

export default async function AccountPage({ params }: PageProps<"/[locale]/compte">) {
  const locale = (await params).locale as Locale;
  const session = await requireRole(["visitor", "artist", "admin"], "/compte");
  const [t, tn] = await Promise.all([
    getTranslations({ locale, namespace: "account" }),
    getTranslations({ locale, namespace: "nav" }),
  ]);

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, username, bio, bio_en, city, country, website, preferred_locale")
    .eq("id", session.id)
    .single();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-4 py-12 sm:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-caps text-accent">{t(`role.${session.role}`)}</p>
          <h1 className="mt-2 font-serif text-4xl">{t("title")}</h1>
        </div>
        <form action={signOut}>
          <input type="hidden" name="locale" value={locale} />
          <button type="submit" className="btn btn-ghost">
            <LogOutIcon size={16} />
            {tn("signOut")}
          </button>
        </form>
      </header>

      {session.role === "visitor" && (
        <section className="hairline-frame flex flex-col gap-3 rounded-sm p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-serif text-2xl">{t("becomeArtist")}</h2>
            <p className="mt-1 text-sm text-ink-soft">{t("becomeArtistText")}</p>
          </div>
          <Link href="/compte/devenir-artiste" className="btn btn-secondary shrink-0">
            {t("becomeArtist")}
          </Link>
        </section>
      )}

      <section className="flex flex-col gap-6">
        <h2 className="label-caps text-ink-soft">{t("profile")}</h2>
        <AvatarUpload userId={session.id} name={session.display_name} url={session.avatar_url} />
        {profile && <ProfileForm profile={profile} />}
      </section>

      <section className="flex flex-col gap-6 border-t border-hairline-soft pt-8">
        <h2 className="label-caps text-ink-soft">{t("security")}</h2>
        <PasswordForm />
      </section>
    </div>
  );
}
