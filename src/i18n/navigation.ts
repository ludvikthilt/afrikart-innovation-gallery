import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// À utiliser à la place de next/link et next/navigation : conserve la langue courante.
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
