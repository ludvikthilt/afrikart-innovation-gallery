import Image from "next/image";
import { brand } from "@/config/brand";

type LogoProps = {
  /** Fond clair (impression) : utilise LOGO_LIGHT_URL si défini. */
  onLight?: boolean;
  /** Taille : compacte dans la barre du haut, grande sur la borne et les cartels. */
  size?: "sm" | "lg";
  className?: string;
};

/**
 * Logo défini dans .env : image complète (LOGO_URL), sinon emblème (MARK_URL)
 * + nom en texte (une apostrophe éventuelle prend la couleur secondaire).
 */
export function Logo({ onLight = false, size = "sm", className = "" }: LogoProps) {
  const src = (onLight && brand.logoLightUrl) || brand.logoUrl;

  if (src) {
    return (
      <Image
        src={src}
        alt={brand.fullName}
        width={180}
        height={44}
        priority
        unoptimized={src.endsWith(".svg")}
        className={`${size === "lg" ? "h-14" : "h-9"} w-auto ${className}`}
      />
    );
  }

  const [before, after] = brand.name.includes("'") ? brand.name.split("'") : [brand.name, null];

  return (
    <span translate="no" className={`flex min-w-0 items-center gap-2 leading-none sm:gap-2.5 ${className}`}>
      {brand.markUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={brand.markUrl} alt="" className={size === "lg" ? "h-16 w-auto" : "h-8 w-auto shrink-0 sm:h-10"} />
      )}
      <span className="flex flex-col">
        <span className={`font-display font-bold tracking-wide text-accent ${size === "lg" ? "text-4xl" : "text-[1.15rem] sm:text-[1.4rem]"}`}>
          {before}
          {after !== null && (
            <>
              <span className="text-accent-2">’</span>
              {after}
            </>
          )}
        </span>
        <span
          className={`font-label whitespace-nowrap text-accent-2 uppercase ${
            size === "lg" ? "mt-1.5 text-sm tracking-[0.2em]" : "mt-0.5 text-[0.5rem] tracking-[0.06em] sm:mt-1 sm:text-[0.5625rem] sm:tracking-[0.2em]"
          }`}
        >
          {brand.subtitle}
        </span>
      </span>
    </span>
  );
}
