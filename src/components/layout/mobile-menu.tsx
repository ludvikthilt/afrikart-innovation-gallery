"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { signOut } from "@/actions/auth";
import { CloseIcon, LogOutIcon } from "@/components/ui/icons";
import { Link, usePathname } from "@/i18n/navigation";
import type { UserRole } from "@/types/database";
import { LocaleSwitcher } from "./locale-switcher";

type Props = {
  user: { name: string; role: UserRole; unread: number } | null;
};

/** Menu de navigation mobile (hamburger) : panneau latéral natif <dialog>. */
export function MobileMenu({ user }: Props) {
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const links: { href: string; label: string; badge?: number }[] = [
    { href: "/", label: t("hall") },
    { href: "/expositions", label: t("exhibitions") },
    { href: "/artistes", label: t("artists") },
    { href: "/recherche", label: t("search") },
    ...(user
      ? [
          { href: "/messages", label: t("messages"), badge: user.unread },
          ...(user.role === "artist" || user.role === "admin" ? [{ href: "/studio", label: t("studio") }] : []),
          ...(user.role === "admin" ? [{ href: "/admin", label: t("admin") }] : []),
          { href: "/compte", label: t("account") },
        ]
      : []),
  ];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("openMenu")}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="relative flex size-10 items-center justify-center rounded-sm text-ink hover:bg-surface-raised"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
        {user && user.unread > 0 && <span aria-hidden="true" className="absolute top-1.5 right-1.5 size-2 rounded-full bg-accent-2" />}
      </button>

      <dialog
        ref={dialog}
        onClose={() => setOpen(false)}
        onClick={(e) => e.target === dialog.current && setOpen(false)}
        aria-label={t("main")}
        className="m-0 ml-auto h-dvh max-h-dvh w-[min(22rem,86vw)] max-w-none border-l border-hairline-soft bg-surface p-0 text-ink backdrop:bg-black/40 backdrop:backdrop-blur-sm"
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-hairline-soft px-5 py-3">
            <span className="label-caps text-ink-muted">{user ? user.name : t("menu")}</span>
            <button type="button" onClick={() => setOpen(false)} aria-label={t("closeMenu")} className="flex size-10 items-center justify-center text-ink-soft hover:text-ink">
              <CloseIcon />
            </button>
          </div>

          <nav aria-label={t("main")} className="flex-1 overflow-y-auto px-3 py-4">
            <ul className="flex flex-col">
              {links.map((l) => {
                const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
                return (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      onClick={() => setOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={`flex min-h-12 items-center justify-between rounded-sm px-3 text-lg transition-colors ${
                        active ? "bg-surface-raised font-semibold text-ink" : "text-ink-soft hover:bg-surface-raised hover:text-ink"
                      }`}
                    >
                      {l.label}
                      {l.badge ? (
                        <span className="flex min-w-6 items-center justify-center rounded-full bg-accent px-1.5 font-label text-xs text-white">{l.badge}</span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="flex flex-col gap-3 border-t border-hairline-soft px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="flex items-center justify-between">
              <span className="label-caps text-ink-muted">{t("language")}</span>
              <Suspense fallback={null}>
                <LocaleSwitcher />
              </Suspense>
            </div>
            {user ? (
              <form action={signOut}>
                <input type="hidden" name="locale" value={locale} />
                <button type="submit" className="btn btn-secondary w-full">
                  <LogOutIcon size={16} />
                  {t("signOut")}
                </button>
              </form>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link href="/connexion" onClick={() => setOpen(false)} className="btn btn-secondary">
                  {t("signIn")}
                </Link>
                <Link href="/inscription" onClick={() => setOpen(false)} className="btn btn-primary">
                  {t("signUp")}
                </Link>
              </div>
            )}
          </div>
        </div>
      </dialog>
    </>
  );
}
