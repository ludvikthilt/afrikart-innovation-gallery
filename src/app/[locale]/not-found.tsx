import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("common");
  return (
    <main id="contenu" className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-5 px-4 py-24 text-center">
      <p className="label-caps text-accent">404</p>
      <h1 className="font-serif text-4xl text-balance">{t("notFoundTitle")}</h1>
      <p className="text-ink-soft">{t("notFoundText")}</p>
      <Link href="/" className="btn btn-primary mt-2">
        {t("backToHall")}
      </Link>
    </main>
  );
}
