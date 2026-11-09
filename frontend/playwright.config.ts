import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration. There are currently no e2e specs (the old ones targeted pages that no
 * longer exist and were removed); add specs under tests/ and, to run them against a local build,
 * a `webServer` block — see https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
