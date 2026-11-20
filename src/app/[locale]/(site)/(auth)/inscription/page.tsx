import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SignUpForm } from "@/components/auth/auth-forms";
import { Link } from "@/i18n/navigation";

export async function generateMetadata({ params }: PageProps<"/[locale]/inscription">): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale as "fr" | "en", namespace: "auth" });
  return { title: t("signUpTitle"), robots: { index: false } };
}

export default async function SignUpPage() {
  const t = await getTranslations("auth");

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2 text-center">
        <h1 className="font-serif text-4xl">{t("signUpTitle")}</h1>
        <p className="text-ink-soft">{t("signUpIntro")}</p>
      </header>
      <SignUpForm />
      <p className="text-center text-sm text-ink-soft">
        {t("haveAccount")}{" "}
        <Link href="/connexion" className="text-accent underline-offset-4 hover:underline">
          {t("goSignIn")}
        </Link>
      </p>
    </div>
  );
}
