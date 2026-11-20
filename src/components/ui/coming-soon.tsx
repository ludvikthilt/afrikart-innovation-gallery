import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

/** Écran d'attente pour les espaces livrés dans les phases suivantes. */
export async function ComingSoon({ title }: { title: string }) {
  const t = await getTranslations("common");
  return (
    <section className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-5 px-4 py-24 text-center">
      <p className="label-caps text-accent">{t("comingSoon")}</p>
      <h1 className="font-serif text-4xl text-balance">{title}</h1>
      <p className="text-ink-soft">{t("comingSoonText")}</p>
      <Link href="/" className="btn btn-secondary mt-2">
        {t("backToHall")}
      </Link>
    </section>
  );
}
