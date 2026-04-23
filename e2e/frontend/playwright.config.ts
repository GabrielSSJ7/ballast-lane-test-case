import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [["html"], ["list"]],
  globalSetup: "./global-setup",

  use: {
    baseURL: "http://localhost:5174",
    trace: "on-first-retry",
    actionTimeout: 10000,
    navigationTimeout: 15000,
  },

  timeout: 30000,

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
