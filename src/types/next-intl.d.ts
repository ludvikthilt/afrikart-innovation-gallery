import type messages from "../../messages/fr.json";
import type { Locale } from "@/i18n/routing";

// Clés de traduction vérifiées par TypeScript (fr.json est la référence).
declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: typeof messages;
  }
}
