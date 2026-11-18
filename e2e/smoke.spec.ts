import { expect, test } from "@playwright/test";

function futureDate(daysFromNow: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().slice(0, 10);
}

function searchParams() {
  return new URLSearchParams({
    origin: "TUN",
    destination: "IST",
    departureDate: futureDate(30),
    tripType: "ONE_WAY",
    adults: "1",
    children: "0",
    infants: "0",
    cabinClass: "ECONOMY",
    auto: "1",
  });
}

const NO_PROVIDER = /Aucun fournisseur de vols réel/i;
const DEMO_BANNER = /Mode démonstration/i;

test("home page renders the French landing page", async ({ page }) => {
  await page.goto("/fr");

  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "Rechercher un vol" }).first()).toBeVisible();
});

/**
 * The suite runs against whatever the server is configured with:
 *  - demo mode (Playwright's own server): offers are generated and labelled;
 *  - no provider: the API must answer with an explicit message, never
 *    fabricated offers.
 */
test("search returns real offers or an explicit no-provider message", async ({ page }) => {
  await page.goto(`/fr/search?${searchParams().toString()}`);

  const demoBanner = page.getByText(DEMO_BANNER).first();
  const noProvider = page.getByText(NO_PROVIDER).first();
  await expect(demoBanner.or(noProvider)).toBeVisible({ timeout: 30_000 });

  if (await noProvider.isVisible()) {
    await expect(page.locator("main article")).toHaveCount(0);
    return;
  }

  const cards = page.locator("main article");
  await expect(cards.first()).toBeVisible();
  expect(await cards.count()).toBeGreaterThan(0);

  await cards.first().getByRole("link", { name: "Voir le détail" }).click();

  await expect(page).toHaveURL(/\/fr\/flights\/.+/);
  await expect(page.getByRole("heading", { name: /Tunis.*Istanbul/ })).toBeVisible();
  await expect(page.getByText(/escales?/).first()).toBeVisible();
});

test("compare page renders selected offers side by side", async ({ page }) => {
  await page.goto(`/fr/search?${searchParams().toString()}`);

  const compareButtons = page.getByRole("button", { name: "Comparer" });
  const noProvider = page.getByText(NO_PROVIDER).first();
  await expect(compareButtons.first().or(noProvider)).toBeVisible({ timeout: 30_000 });

  test.skip(
    (await compareButtons.count()) < 2,
    "needs at least two offers (configure a real provider or DEMO_MODE=true)",
  );

  await compareButtons.nth(0).click();
  await compareButtons.nth(1).click();

  const compareLink = page.getByRole("link", { name: /comparer/i }).last();
  await compareLink.click();

  await expect(page).toHaveURL(/\/fr\/compare\?ids=/);
  await expect(page.getByRole("heading", { name: "Comparer les vols" })).toBeVisible();
  await expect(page.locator("table")).toBeVisible();
});
