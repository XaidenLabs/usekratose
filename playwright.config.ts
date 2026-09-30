import { defineConfig, devices } from "@playwright/test";

const localBrowser =
  process.platform === "darwin" && !process.env.CI
    ? { channel: "chrome" as const }
    : {};

export default defineConfig({
  expect: { timeout: 10_000 },
  forbidOnly: Boolean(process.env.CI),
  fullyParallel: true,
  reporter: process.env.CI ? "github" : "list",
  retries: process.env.CI ? 2 : 0,
  testDir: "./e2e",
  timeout: 45_000,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "https://usekratose.site",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop-chromium",
      use: { ...devices["Desktop Chrome"], ...localBrowser },
    },
    {
      name: "mobile-chromium",
      use: { ...devices["Pixel 7"], ...localBrowser },
    },
  ],
});
