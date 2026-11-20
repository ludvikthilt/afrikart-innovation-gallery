"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ShareIcon } from "@/components/ui/icons";

/** Partage natif (WhatsApp, etc. sur mobile), sinon copie du lien. */
export function ShareButton({ title, path }: { title: string; path: string }) {
  const t = useTranslations("artwork");
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = new URL(path, window.location.origin).toString();
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Partage annulé par le visiteur.
    }
  };

  return (
    <button
      type="button"
      onClick={share}
      aria-label={t("share")}
      className="flex min-h-11 items-center gap-2 rounded-sm px-2 text-ink-soft hover:text-ink"
    >
      <ShareIcon size={20} />
      <span className="text-xs" aria-live="polite">
        {copied ? t("linkCopied") : ""}
      </span>
    </button>
  );
}
