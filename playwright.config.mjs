import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60000,
  workers: 1,
  use: { baseURL: process.env.TEST_BASE_URL || "http://127.0.0.1:3107", channel: "chrome", timezoneId: "America/Santiago", screenshot: "only-on-failure" },
  projects: [
    { name: "desktop", use: { viewport: { width: 1365, height: 900 } } },
    { name: "mobile", use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
});
