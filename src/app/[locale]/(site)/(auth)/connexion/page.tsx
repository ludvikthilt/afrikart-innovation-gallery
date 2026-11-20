import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SignInForm } from "@/components/auth/auth-forms";
import { Link } from "@/i18n/navigation";
import { safeNextPath } from "@/lib/auth";

export async function generateMetadata({ params }: PageProps<"/[locale]/connexion">): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale as "fr" | "en", namespace: "auth" });
  return { title: t("signInTitle"), robots: { index: false } };
}

export default async function SignInPage({ searchParams }: PageProps<"/[locale]/connexion">) {
  const [t, query] = await Promise.all([getTranslations("auth"), searchParams]);
  const next = safeNextPath(query.next);
  const callbackFailed = query.erreur === "lien";

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2 text-center">
        <h1 className="font-serif text-4xl">{t("signInTitle")}</h1>
        <p className="text-ink-soft">{t("signInIntro")}</p>
      </header>
      {callbackFailed && (
        <p role="alert" className="rounded-sm border border-danger/40 px-4 py-3 text-sm text-danger">
          {t("errors.callback")}
        </p>
      )}
      <SignInForm next={next} />
      <p className="text-center text-sm text-ink-soft">
        {t("noAccount")}{" "}
        <Link href="/inscription" className="text-accent underline-offset-4 hover:underline">
          {t("goSignUp")}
        </Link>
      </p>
    </div>
  );
}
