import Image from "next/image";
import { publicImageUrl } from "@/lib/images";

/** Avatar rond : photo si disponible, sinon initiales. */
export function Avatar({ name, url, size = 40, className = "" }: { name: string; url: string | null; size?: number; className?: string }) {
  const src = publicImageUrl(url, "avatars");
  const initials = name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-raised font-label text-ink ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      aria-hidden="true"
    >
      {src ? <Image src={src} alt="" fill sizes={`${size}px`} className="object-cover" /> : initials}
    </span>
  );
}
