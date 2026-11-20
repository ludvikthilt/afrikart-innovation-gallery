import { defineConfig, devices } from "@playwright/test";

/**
 * Test e2e du parcours visiteur. Prérequis : Supabase local avec le seed
 * (`npm run db:start`) et .env.local rempli. Lance l'app en production.
 * Navigateur : Microsoft Edge installé (aucun téléchargement), ou
 * `npx playwright install chromium` puis PW_CHANNEL= (vide).
 */
const channel = process.env.PW_CHANNEL ?? "msedge";

export default defineConfig({
  testDir: "e2e",
  timeout: 45_000,
  retries: process.env.CI ? 1 : 0,
  // fr-FR : sinon la détection de langue du site renvoie vers /en.
  use: { baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3100", locale: "fr-FR", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], ...(channel ? { channel } : {}) } },
    { name: "mobile", use: { ...devices["Pixel 7"], ...(channel ? { channel } : {}) } },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : { command: "npm run build && npx next start -p 3100", url: "http://localhost:3100", timeout: 240_000, reuseExistingServer: true },
});
