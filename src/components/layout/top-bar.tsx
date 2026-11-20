import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { brand } from "@/config/brand";
import { Link } from "@/i18n/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { countUnread } from "@/lib/data/messages";
import { SearchPalette } from "@/components/search/search-palette";
import { MessageIcon, UserIcon } from "@/components/ui/icons";
import { LocaleSwitcher } from "./locale-switcher";
import { MobileMenu } from "./mobile-menu";
import { Logo } from "./logo";

/** Barre supérieure minimale : elle doit s'effacer devant les œuvres. */
export async function TopBar() {
  const t = await getTranslations("nav");

  return (
    <header className="sticky top-0 z-50 border-b border-hairline-soft bg-overlay backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-[1600px] items-center justify-between gap-2 px-3 sm:gap-3 sm:px-8 lg:px-12">
        <div className="flex min-w-0 items-center gap-8">
          <Link href="/" className="min-w-0 rounded-sm" aria-label={`${t("hall")} — ${brand.fullName}`}>
            <Logo />
          </Link>
          <nav aria-label={t("main")} className="hidden items-center gap-6 md:flex">
            <Link href="/expositions" className="text-sm text-ink-soft hover:text-ink">
              {t("exhibitions")}
            </Link>
            <Link href="/artistes" className="text-sm text-ink-soft hover:text-ink">
              {t("artists")}
            </Link>
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <SearchPalette />
          {/* Ordinateur : langue et compte dans la barre. Mobile : dans le menu hamburger. */}
          <div className="hidden items-center gap-2 md:flex">
            <Suspense fallback={<span className="h-9 w-12" />}>
              <LocaleSwitcher />
            </Suspense>
            <Suspense fallback={<span className="h-9 w-24" />}>
              <AccountLinks />
            </Suspense>
          </div>
          <div className="md:hidden">
            <Suspense fallback={<span className="block size-10" />}>
              <MobileMenuSlot />
            </Suspense>
          </div>
        </div>
      </div>
    </header>
  );
}

async function AccountLinks() {
  const [t, profile] = await Promise.all([getTranslations("nav"), getCurrentProfile()]);

  if (!profile) {
    return (
      <Link href="/connexion" className="btn btn-secondary min-h-9 px-3 sm:px-4">
        {t("signIn")}
      </Link>
    );
  }

  const unread = await countUnread(profile.id);
  const initials = profile.display_name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex items-center gap-1 sm:gap-2">
      {profile.role === "admin" && (
        <Link href="/admin" className="label-caps hidden px-2 py-2 text-ink-soft hover:text-ink lg:block">
          {t("admin")}
        </Link>
      )}
      {(profile.role === "artist" || profile.role === "admin") && (
        <Link href="/studio" className="label-caps hidden px-2 py-2 text-ink-soft hover:text-ink sm:block">
          {t("studio")}
        </Link>
      )}
      <Link
        href="/messages"
        aria-label={unread ? `${t("messages")} — ${t("unread", { count: unread })}` : t("messages")}
        className="relative flex size-9 items-center justify-center text-ink-soft hover:text-ink"
      >
        <MessageIcon size={18} />
        {unread > 0 && (
          <span aria-hidden="true" className="absolute top-0.5 right-0 flex min-w-4 items-center justify-center rounded-full bg-accent px-1 font-label text-[0.625rem] text-white">
            {unread}
          </span>
        )}
      </Link>
      <Link
        href="/compte"
        aria-label={`${t("account")} — ${profile.display_name}`}
        className="flex size-9 items-center justify-center rounded-full bg-accent font-label text-xs font-semibold text-white transition-colors hover:bg-accent-hover"
      >
        {initials || <UserIcon size={16} />}
      </Link>
    </div>
  );
}

async function MobileMenuSlot() {
  const profile = await getCurrentProfile();
  const unread = profile ? await countUnread(profile.id) : 0;
  return <MobileMenu user={profile ? { name: profile.display_name, role: profile.role, unread } : null} />;
}
