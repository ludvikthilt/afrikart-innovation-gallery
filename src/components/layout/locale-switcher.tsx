"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { GlobeIcon } from "@/components/ui/icons";

/** Bascule FR / EN en gardant la page et les paramètres (salle, œuvre…). */
export function LocaleSwitcher() {
  const t = useTranslations("locale");
  const locale = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const next = locale === "fr" ? "en" : "fr";

  return (
    <button
      type="button"
      onClick={() =>
        startTransition(() => {
          const query = Object.fromEntries(searchParams.entries());
          router.replace({ pathname, query }, { locale: next, scroll: false });
        })
      }
      disabled={pending}
      lang={next}
      aria-label={`${t("label")} : ${t(next)}`}
      className="flex h-9 items-center gap-1.5 rounded-sm px-2 text-ink-soft transition-colors hover:text-ink disabled:opacity-60"
    >
      <GlobeIcon size={16} />
      <span className="label-caps">{next.toUpperCase()}</span>
    </button>
  );
}
