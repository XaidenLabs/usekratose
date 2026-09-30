import { expect, test } from "@playwright/test";

test("public application and health endpoint are reachable", async ({
  page,
  request,
}) => {
  const health = await request.get("/api/health");
  expect(health.ok()).toBe(true);
  const body = (await health.json()) as { readonly status?: string };
  expect(["ready", "degraded"]).toContain(body.status);

  await page.goto("/");
  await expect(page).toHaveTitle(/UseKratose/i);
  await expect(
    page.getByText("UseKratose", { exact: true }).first(),
  ).toBeVisible();
});

test("login page remains usable", async ({ page }) => {
  await page.goto("/login");
  await expect(
    page.getByRole("heading", { name: "Welcome back" }),
  ).toBeVisible();
  await expect(page.getByLabel("Email address")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in" })).toBeEnabled();
});

test("authenticated user reaches the security console", async ({ page }) => {
  const email = process.env.E2E_USER_EMAIL;
  const password = process.env.E2E_USER_PASSWORD;
  test.skip(!email || !password, "E2E credentials are not configured");

  await page.goto("/login");
  await page.getByLabel("Email address").fill(email ?? "");
  await page.getByLabel("Password").fill(password ?? "");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/dashboard\/(overview|onboarding)/, {
    timeout: 30_000,
  });
  await expect(
    page.getByText(/Continuous verification|security workspace/i).first(),
  ).toBeVisible();
});
