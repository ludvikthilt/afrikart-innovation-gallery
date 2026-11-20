import { getLocale, getTranslations } from "next-intl/server";
import { brand } from "@/config/brand";

export async function Footer() {
  const [t, locale] = await Promise.all([getTranslations("footer"), getLocale()]);
  const place = [brand.contact.city, brand.contact.country].filter(Boolean).join(", ");
  const socials = [
    { href: brand.contact.instagram, label: "Instagram" },
    { href: brand.contact.facebook, label: "Facebook" },
    { href: brand.contact.tiktok, label: "TikTok" },
    { href: brand.contact.whatsapp && `https://wa.me/${brand.contact.whatsapp.replace(/\D/g, "")}`, label: "WhatsApp" },
  ].filter((s): s is { href: string; label: string } => Boolean(s.href));

  return (
    <footer className="border-t border-hairline-soft">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-4 py-6 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-12">
        <div className="flex flex-col gap-1">
          <p className="font-serif text-lg italic text-ink">{brand.tagline[locale === "en" ? "en" : "fr"]}</p>
          {brand.event[locale === "en" ? "en" : "fr"] && (
            <p className="label-caps text-ink-muted">{brand.event[locale === "en" ? "en" : "fr"]}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-soft">
          {brand.contact.email && (
            <a href={`mailto:${brand.contact.email}`} className="hover:text-ink">
              {t("contact")} · {brand.contact.email}
            </a>
          )}
          {socials.map((s) => (
            <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" className="hover:text-ink">
              {s.label}
            </a>
          ))}
          <span>
            © {new Date().getFullYear()} {brand.fullName}
            {place && ` · ${place}`}. {t("rights")}
          </span>
        </div>
      </div>
    </footer>
  );
}
