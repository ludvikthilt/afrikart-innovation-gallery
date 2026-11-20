import { getRequestConfig } from "next-intl/server";
import { locale as rootLocale } from "next/root-params";
import { isLocale, routing } from "./routing";

async function readRootLocale(): Promise<string | undefined> {
  try {
    return await rootLocale();
  } catch {
    // next/root-params n'est pas disponible dans les Server Actions
    // et les Route Handlers : on se rabat sur la valeur du proxy.
    return undefined;
  }
}

export default getRequestConfig(async ({ locale: override, requestLocale }) => {
  const candidate = override ?? (await readRootLocale()) ?? (await requestLocale);
  const locale = isLocale(candidate) ? candidate : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
    timeZone: "Africa/Douala",
  };
});
