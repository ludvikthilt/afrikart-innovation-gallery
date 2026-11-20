"use client";

import { useEffect, useState, useTransition } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { addComment, deleteComment, getComments, setCommentHidden, type CommentsPayload } from "@/actions/social";
import { Link } from "@/i18n/navigation";
import type { Viewer } from "@/lib/visit/types";

type Props = { artworkId: string; viewer: Viewer; returnPath: string; onCount?: (count: number) => void };

/** Commentaires d'une œuvre, chargés à l'ouverture du panneau. */
export function Comments({ artworkId, viewer, returnPath, onCount }: Props) {
  const t = useTranslations("comments");
  const format = useFormatter();
  const [data, setData] = useState<CommentsPayload | null>(null);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let alive = true;
    getComments(artworkId).then((payload) => alive && setData(payload));
    return () => {
      alive = false;
    };
  }, [artworkId]);

  const refresh = async () => {
    const payload = await getComments(artworkId);
    setData(payload);
    onCount?.(payload.comments.filter((c) => !c.is_hidden).length);
  };

  const submit = () =>
    startTransition(async () => {
      setError(null);
      const result = await addComment(artworkId, body);
      if ("error" in result) {
        setError(t(result.error === "invalid" ? "errorInvalid" : "errorGeneric"));
        return;
      }
      setBody("");
      await refresh();
    });

  const moderate = (fn: () => Promise<{ ok: boolean }>) =>
    startTransition(async () => {
      await fn();
      await refresh();
    });

  return (
    <section aria-labelledby={`comments-${artworkId}`} className="flex flex-col gap-4">
      <h3 id={`comments-${artworkId}`} className="label-caps text-ink-soft">
        {t("title")} {data && `(${data.comments.filter((c) => !c.is_hidden).length})`}
      </h3>

      {viewer ? (
        <form
          action={submit}
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            if (!body.trim()) e.preventDefault();
          }}
        >
          <label htmlFor={`comment-${artworkId}`} className="sr-only">
            {t("placeholder")}
          </label>
          <textarea
            id={`comment-${artworkId}`}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={1000}
            rows={2}
            placeholder={t("placeholder")}
            className="field-input min-h-0 resize-y text-sm"
          />
          <div className="flex items-center justify-between gap-3">
            <span role="alert" className="text-sm text-danger">
              {error}
            </span>
            <button type="submit" className="btn btn-secondary min-h-9 px-4" disabled={pending || !body.trim()}>
              {t("send")}
            </button>
          </div>
        </form>
      ) : (
        <p className="text-sm text-ink-soft">
          <Link href={{ pathname: "/connexion", query: { next: returnPath } }} className="text-accent hover:underline">
            {t("signInToComment")}
          </Link>
        </p>
      )}

      {data === null ? (
        <p className="text-sm text-ink-muted">…</p>
      ) : data.comments.length === 0 ? (
        <p className="text-sm text-ink-muted">{t("empty")}</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {data.comments.map((c) => (
            <li key={c.id} className={`flex flex-col gap-1 ${c.is_hidden ? "opacity-50" : ""}`}>
              <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
                <span className="font-semibold text-ink">{c.author?.display_name ?? "—"}</span>
                <time dateTime={c.created_at} className="text-xs text-ink-muted">
                  {format.dateTime(new Date(c.created_at), { dateStyle: "medium" })}
                </time>
                {c.is_hidden && <span className="label-caps text-ink-muted">{t("hidden")}</span>}
              </p>
              <p className="text-sm whitespace-pre-line text-ink-soft">{c.body}</p>
              {(data.canModerate || c.mine) && (
                <div className="flex gap-3">
                  {data.canModerate && (
                    <button
                      type="button"
                      className="text-xs text-ink-muted underline-offset-2 hover:text-ink hover:underline"
                      onClick={() => moderate(() => setCommentHidden(c.id, !c.is_hidden))}
                    >
                      {c.is_hidden ? t("show") : t("hide")}
                    </button>
                  )}
                  {(c.mine || viewer?.role === "admin") && (
                    <button
                      type="button"
                      className="text-xs text-ink-muted underline-offset-2 hover:text-danger hover:underline"
                      onClick={() => moderate(() => deleteComment(c.id))}
                    >
                      {t("delete")}
                    </button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
