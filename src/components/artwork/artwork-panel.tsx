"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { contactArtist } from "@/actions/social";
import { CommentIcon, MessageIcon, QrIcon } from "@/components/ui/icons";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { localized } from "@/lib/format";
import type { ArtworkStats, Rates, Viewer, VisitArtwork } from "@/lib/visit/types";
import { Comments } from "./comments";
import { LikeButton } from "./like-button";
import { PriceBlock } from "./price-block";
import { ShareButton } from "./share-button";

type Props = {
  artwork: VisitArtwork;
  stats: ArtworkStats;
  rates: Rates | null;
  viewer: Viewer;
  /** Chemin courant (retour après connexion, contact). */
  returnPath: string;
  /** Petite étiquette au-dessus du titre, ex. « Salle 1 · Œuvre 3 / 12 ». */
  eyebrow?: string;
  headingLevel?: "h1" | "h2";
};

/** Fiche d'information d'une œuvre : cartel détaillé, prix, actions, commentaires. */
export function ArtworkPanel({ artwork, stats, rates, viewer, returnPath, eyebrow, headingLevel = "h2" }: Props) {
  const t = useTranslations("artwork");
  const locale = useLocale() as Locale;
  const [counts, setCounts] = useState(stats);
  const Heading = headingLevel;

  const title = localized(locale, artwork.title, artwork.title_en);
  const description = localized(locale, artwork.description, artwork.description_en);
  const isOwner = viewer?.id === artwork.artist.id;
  const canBuy = artwork.for_sale && (artwork.sale_status === "available" || artwork.sale_status === "reserved");

  const facts = ([
    [t("year"), artwork.year],
    [t("medium"), localized(locale, artwork.medium, artwork.medium_en)],
    [t("dimensions"), artwork.dimensions],
    [
      t("collection"),
      artwork.collection && (
        <Link href={`/collections/${artwork.collection.slug}`} className="underline-offset-4 hover:text-accent hover:underline">
          {artwork.collection.title}
        </Link>
      ),
    ],
  ] as [string, React.ReactNode][]).filter((f) => Boolean(f[1]));

  return (
    <article className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        {eyebrow && <p className="label-caps text-accent">{eyebrow}</p>}
        <Heading className="font-serif text-[1.75rem] leading-tight italic sm:text-4xl">{title}</Heading>
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex size-10 items-center justify-center rounded-full bg-surface-raised font-label text-sm text-ink"
          >
            {artwork.artist.display_name.slice(0, 1)}
          </span>
          <div className="flex flex-col">
            <span className="font-semibold">{artwork.artist.display_name}</span>
            {artwork.artist.username && (
              <Link href={`/artistes/${artwork.artist.username}`} className="text-sm text-ink-soft hover:text-accent">
                {t("seeArtist")}
              </Link>
            )}
          </div>
        </div>
      </header>

      {facts.length > 0 && (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 border-y border-hairline-soft py-4">
          {facts.map(([label, value]) => (
            <div key={label} className="flex flex-col gap-0.5">
              <dt className="label-caps text-ink-muted">{label}</dt>
              <dd className="text-sm text-ink">{value}</dd>
            </div>
          ))}
        </dl>
      )}

      {description && <p className="leading-7 font-light whitespace-pre-line text-ink-soft">{description}</p>}

      {artwork.for_sale && <PriceBlock price={artwork.price} currency={artwork.currency} status={artwork.sale_status} rates={rates} />}

      {!isOwner && (
        <div className="flex flex-col gap-3 sm:flex-row">
          {canBuy && (
            <form action={contactArtist} className="flex-1">
              <ContactFields artistId={artwork.artist.id} artworkId={artwork.id} intent="interest" from={returnPath} />
              <button type="submit" className="btn btn-primary w-full">
                {t("interested")}
              </button>
            </form>
          )}
          <form action={contactArtist} className="flex-1">
            <ContactFields artistId={artwork.artist.id} artworkId={artwork.id} intent="contact" from={returnPath} />
            <button type="submit" className="btn btn-secondary w-full">
              <MessageIcon size={16} />
              {t("contact")}
            </button>
          </form>
        </div>
      )}

      <div className="flex items-center gap-2 border-y border-hairline-soft py-1">
        <LikeButton
          artworkId={artwork.id}
          likes={counts.likes}
          liked={counts.liked}
          returnPath={returnPath}
          onChange={(s) => setCounts((c) => ({ ...c, ...s }))}
        />
        <a href={`#comments-${artwork.id}`} className="flex min-h-11 items-center gap-2 px-2 text-ink-soft hover:text-ink">
          <CommentIcon size={20} />
          <span className="font-label text-sm">{counts.comments}</span>
          <span className="sr-only">{t("comments")}</span>
        </a>
        <ShareButton title={title} path={`/oeuvres/${artwork.slug}`} />
        <Link
          href={`/cartel/${artwork.slug}`}
          className="ml-auto flex min-h-11 items-center gap-2 px-2 text-ink-soft hover:text-ink"
          aria-label={t("qrLabel")}
        >
          <QrIcon size={20} />
          <span className="label-caps hidden sm:inline">{t("qr")}</span>
        </Link>
      </div>

      <Comments
        key={artwork.id}
        artworkId={artwork.id}
        viewer={viewer}
        returnPath={returnPath}
        onCount={(comments) => setCounts((c) => ({ ...c, comments }))}
      />
    </article>
  );
}

function ContactFields(props: { artistId: string; artworkId: string; intent: "interest" | "contact"; from: string }) {
  return (
    <>
      <input type="hidden" name="artistId" value={props.artistId} />
      <input type="hidden" name="artworkId" value={props.artworkId} />
      <input type="hidden" name="intent" value={props.intent} />
      <input type="hidden" name="from" value={props.from} />
    </>
  );
}
