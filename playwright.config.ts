import { defineConfig, devices } from "@playwright/test";

// The same tests run in all three browser engines: Chromium (Chrome, Edge),
// Firefox (Gecko), and WebKit (Safari's engine).
export default defineConfig({
  testDir: "test/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: "http://localhost:4173" },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  webServer: {
    command: "node scripts/serve.mjs",
    url: "http://localhost:4173/test/fixtures/index.html",
    reuseExistingServer: !process.env.CI,
  },
});
