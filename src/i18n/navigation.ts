import { createElement, type ComponentProps } from "react";
import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// À utiliser à la place de next/link et next/navigation : conserve la langue courante.
const navigation = createNavigation(routing);
export const { redirect, usePathname, useRouter, getPathname } = navigation;

/**
 * Lien localisé, sans préchargement automatique par défaut : sur une connexion
 * mobile lente, précharger chaque page liée concurrence les images des œuvres.
 * Passer `prefetch` explicitement pour l'activer sur un lien précis.
 */
export function Link(props: ComponentProps<typeof navigation.Link>) {
  return createElement(navigation.Link, { prefetch: false, ...props });
}
