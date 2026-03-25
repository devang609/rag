import { expect, test } from "@playwright/test";

test("loads the split-pane experience", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Order-to-Cash Context Graph/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Grounded Answers/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Relationships/i })).toBeVisible();
});

test("renders a large graph neighborhood after searching for a node", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText(/3 nodes loaded/i)).toBeVisible();

  const searchInput = page.locator("#graph-search");
  await searchInput.fill("Cookmouth");
  await expect(page.locator(".searchResult")).toHaveCount(1);
  await page.locator(".searchResult").first().click();

  await expect(page.getByText(/221 nodes loaded/i)).toBeVisible();
  await expect(page.getByRole("heading", { name: /Cookmouth Plant/i })).toBeVisible();
  await expect(page.locator(".graphCanvas canvas")).toHaveCount(3);
});
