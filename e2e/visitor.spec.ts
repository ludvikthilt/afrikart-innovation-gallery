import { expect, test } from "@playwright/test";

// Parcours visiteur sur les données de l'exposition « Lumières d'Afrique ».
test("hall → salle → mur suivant → focus → retour à la salle (visite légère)", async ({ page, isMobile }) => {
  await page.addInitScript(() => localStorage.setItem("afk:visit-mode", "light"));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Lumières d'Afrique" })).toBeVisible();

  await page.getByRole("link", { name: "Entrer dans la galerie" }).click();
  await expect(page).toHaveURL(/\/visite\/lumieres-d-afrique\?salle=1&mur=1/);

  // Se déplacer : clavier sur ordinateur, flèche à l'écran sur mobile.
  if (isMobile) await page.getByRole("button", { name: "Œuvre suivante" }).click();
  else await page.keyboard.press("ArrowRight");
  await expect(page).toHaveURL(/salle=1&mur=2/);

  // Regarder une œuvre de près : 3 interactions depuis l'entrée.
  await page.getByRole("button", { name: /^Regarder de près/ }).first().click();
  await expect(page).toHaveURL(/oeuvre=/);
  const panel = page.getByRole("complementary", { name: "Informations sur l'œuvre" });
  await expect(panel.getByRole("heading", { level: 2 })).toBeVisible();
  await expect(panel.getByRole("button", { name: /Contacter l'artiste/ })).toBeVisible();

  await page.getByRole("button", { name: "Revenir à la salle" }).click();
  await expect(page).not.toHaveURL(/oeuvre=/);
});

test("la visite 3D s'affiche et ne rebascule pas seule", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("afk:visit-mode", "3d"));
  await page.goto("/visite/lumieres-d-afrique");
  await expect(page.locator("canvas")).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(2500);
  await expect(page.locator("canvas")).toBeVisible();
  await expect(page.getByRole("radio", { name: /3D/ })).toHaveAttribute("aria-checked", "true");
});

test("un lien partagé ouvre directement l'œuvre", async ({ page }) => {
  await page.goto("/visite/lumieres-d-afrique?oeuvre=mere-nourriciere");
  const panel = page.getByRole("complementary", { name: "Informations sur l'œuvre" });
  await expect(panel.getByRole("heading", { name: "Mère nourricière" })).toBeVisible();
});

test("fiche œuvre (cible QR) et bascule en anglais", async ({ page }) => {
  await page.goto("/oeuvres/croissant-d-or");
  await expect(page.getByRole("heading", { level: 1, name: "Croissant d'or" })).toBeVisible();
  await expect(page.getByText("Ondoua Julio").first()).toBeVisible();
  await page.getByRole("button", { name: /Langue/ }).click();
  await expect(page).toHaveURL(/\/en\/oeuvres\/croissant-d-or/);
  await expect(page.getByRole("heading", { level: 1, name: "Golden Crescent" })).toBeVisible();
});

test("les zones réservées redirigent vers la connexion", async ({ page }) => {
  await page.goto("/studio");
  await expect(page).toHaveURL(/\/connexion\?next=%2Fstudio/);
});
