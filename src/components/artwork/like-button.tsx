"use client";

import { useOptimistic, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toggleLike } from "@/actions/social";
import { HeartIcon } from "@/components/ui/icons";
import { useRouter } from "@/i18n/navigation";

type Props = {
  artworkId: string;
  likes: number;
  liked: boolean;
  /** Chemin de retour après connexion si le visiteur est anonyme. */
  returnPath: string;
  onChange?: (state: { likes: number; liked: boolean }) => void;
};

export function LikeButton({ artworkId, likes, liked, returnPath, onChange }: Props) {
  const t = useTranslations("artwork");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic({ likes, liked });

  const toggle = () =>
    startTransition(async () => {
      setOptimistic({ liked: !optimistic.liked, likes: optimistic.likes + (optimistic.liked ? -1 : 1) });
      const result = await toggleLike(artworkId);
      if ("error" in result) {
        if (result.error === "auth") router.push({ pathname: "/connexion", query: { next: returnPath } });
        return;
      }
      onChange?.(result);
    });

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={optimistic.liked}
      aria-label={optimistic.liked ? t("unlike") : t("like")}
      className="flex min-h-11 items-center gap-2 rounded-sm px-2 text-ink-soft transition-colors hover:text-ink aria-pressed:text-accent"
    >
      <HeartIcon size={20} fill={optimistic.liked ? "currentColor" : "none"} />
      <span className="font-label text-sm">{optimistic.likes}</span>
    </button>
  );
}
