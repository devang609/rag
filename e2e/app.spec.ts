import { expect, test } from "@playwright/test";

test("loads the split-pane experience", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Order-to-Cash Context Graph/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Grounded Answers/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Relationships/i })).toBeVisible();
});
