import "server-only";
import type { Rates } from "@/lib/visit/types";

// Parité fixe du franc CFA (BEAC) : 1 EUR = 655,957 XAF.
const XAF_PER_EUR = 655.957;
// Valeur de repli si le service de taux est injoignable.
const FALLBACK_USD_PER_EUR = 1.08;
const FALLBACK_DATE = "2026-11-20";

/**
 * Taux indicatifs XAF → EUR / USD. L'euro est fixe ; le dollar vient
 * d'open.er-api.com (sans clé), mis en cache 24 h. Source et date affichées.
 */
export async function getRates(): Promise<Rates> {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/EUR", {
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) throw new Error(String(res.status));
    const data = (await res.json()) as { rates?: { USD?: number }; time_last_update_utc?: string };
    const usdPerEur = data.rates?.USD;
    if (!usdPerEur) throw new Error("USD manquant");
    return {
      eur: 1 / XAF_PER_EUR,
      usd: usdPerEur / XAF_PER_EUR,
      source: "BEAC (EUR) · ExchangeRate-API (USD)",
      date: data.time_last_update_utc ? new Date(data.time_last_update_utc).toISOString().slice(0, 10) : FALLBACK_DATE,
    };
  } catch {
    return {
      eur: 1 / XAF_PER_EUR,
      usd: FALLBACK_USD_PER_EUR / XAF_PER_EUR,
      source: "BEAC (EUR) · estimation (USD)",
      date: FALLBACK_DATE,
    };
  }
}
