"use client";

import { Link, usePathname } from "@/i18n/navigation";

type Item = { href: string; label: string; badge?: number };

/** Menu latéral des espaces de travail (studio, administration). */
export function SideNav({ label, items }: { label: string; items: Item[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label={label} className="flex gap-1 overflow-x-auto border-b border-hairline-soft pb-2 lg:flex-col lg:border-b-0 lg:pb-0">
      {items.map((item) => {
        const active = item.href === pathname || (item.href.split("/").length > 2 && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex shrink-0 items-center justify-between gap-3 rounded-sm px-3 py-2.5 text-sm transition-colors ${
              active ? "bg-surface-raised text-ink" : "text-ink-soft hover:text-ink"
            }`}
          >
            {item.label}
            {item.badge ? (
              <span className="flex min-w-5 items-center justify-center rounded-full bg-accent px-1.5 font-label text-[0.6875rem] text-white">
                {item.badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
