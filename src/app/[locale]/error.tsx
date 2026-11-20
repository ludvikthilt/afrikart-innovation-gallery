"use client";

import { useTranslations } from "next-intl";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("common");
  return (
    <section role="alert" className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-5 px-4 py-24 text-center">
      <h1 className="font-serif text-3xl text-balance">{t("error")}</h1>
      <button type="button" onClick={reset} className="btn btn-secondary">
        {t("retry")}
      </button>
    </section>
  );
}
