"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { getMessagesSince, markConversationRead, sendMessage } from "@/actions/messages";
import { createClient } from "@/lib/supabase/client";
import type { MessageRow } from "@/types/database";

type Props = {
  conversationId: string;
  meId: string;
  initial: MessageRow[];
  draft?: string;
};

/** Fil de messages en temps réel (Supabase Realtime) avec zone de saisie. */
export function Thread({ conversationId, meId, initial, draft = "" }: Props) {
  const t = useTranslations("messages");
  const format = useFormatter();
  const [messages, setMessages] = useState(initial);
  const [body, setBody] = useState(draft);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const end = useRef<HTMLDivElement>(null);

  const add = (incoming: MessageRow[]) => {
    if (incoming.length === 0) return;
    setMessages((list) => {
      const known = new Set(list.map((m) => m.id));
      const fresh = incoming.filter((m) => !known.has(m.id));
      return fresh.length ? [...list, ...fresh].sort((a, b) => a.created_at.localeCompare(b.created_at)) : list;
    });
    if (incoming.some((m) => m.sender_id !== meId)) void markConversationRead(conversationId);
  };
  // Références lues par l'abonnement et le rattrapage (mises à jour après chaque rendu).
  const addRef = useRef(add);
  const lastAt = useRef(initial.at(-1)?.created_at ?? new Date(0).toISOString());
  useEffect(() => {
    addRef.current = add;
    lastAt.current = messages.at(-1)?.created_at ?? lastAt.current;
  });

  // Nouveaux messages en direct (Supabase Realtime, RLS : seuls les participants les voient).
  // Le socket doit porter le jeton de l'utilisateur, d'où la session chargée AVANT l'abonnement.
  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) supabase.realtime.setAuth(data.session.access_token);
      if (cancelled) return;
      channel = supabase
        .channel(`conversation:${conversationId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
          (payload) => addRef.current([payload.new as MessageRow]),
        )
        .subscribe();
    })();
    void markConversationRead(conversationId);

    // Filet de sécurité : sur un réseau mobile instable, le temps réel peut décrocher.
    const poll = setInterval(async () => {
      if (document.visibilityState !== "visible") return;
      addRef.current(await getMessagesSince(conversationId, lastAt.current));
    }, 8000);

    return () => {
      cancelled = true;
      clearInterval(poll);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [conversationId]);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  const submit = () =>
    startTransition(async () => {
      setError(null);
      const result = await sendMessage(conversationId, body);
      if ("error" in result) {
        setError(t("sendError"));
        return;
      }
      setBody("");
      add([result.message]);
    });

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ol className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-6 sm:px-8" aria-live="polite" aria-relevant="additions">
        {messages.length === 0 && <li className="text-center text-sm text-ink-muted">{t("noMessages")}</li>}
        {messages.map((m) => {
          const mine = m.sender_id === meId;
          return (
            <li key={m.id} className={`flex max-w-[85%] flex-col gap-1 ${mine ? "self-end items-end" : "self-start"}`}>
              <p
                className={`rounded-sm px-4 py-2.5 whitespace-pre-line ${mine ? "bg-accent text-white" : "border border-hairline-soft bg-surface"}`}
              >
                <span className="sr-only">{mine ? t("you") : t("them")} : </span>
                {m.body}
              </p>
              <time dateTime={m.created_at} className="text-xs text-ink-muted">
                {format.dateTime(new Date(m.created_at), { dateStyle: "short", timeStyle: "short" })}
                {mine && m.read_at && ` · ${t("read")}`}
              </time>
            </li>
          );
        })}
        <div ref={end} />
      </ol>

      <form
        action={submit}
        onSubmit={(e) => !body.trim() && e.preventDefault()}
        className="flex items-end gap-3 border-t border-hairline-soft px-4 py-3 sm:px-8"
      >
        <label htmlFor="message-body" className="sr-only">
          {t("placeholder")}
        </label>
        <textarea
          id="message-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && body.trim()) {
              e.preventDefault();
              submit();
            }
          }}
          rows={Math.min(5, Math.max(1, body.split("\n").length))}
          maxLength={4000}
          placeholder={t("placeholder")}
          className="field-input min-h-11 flex-1 resize-none"
        />
        <button type="submit" disabled={pending || !body.trim()} className="btn btn-primary">
          {t("send")}
        </button>
      </form>
      {error && (
        <p role="alert" className="px-8 pb-3 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
