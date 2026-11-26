import { defineConfig } from "@playwright/test";

const explicitChannel = process.env.PLAYWRIGHT_CHANNEL;

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:5174",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium", ...(explicitChannel ? { channel: explicitChannel as "chrome" } : {}) },
    },
  ],
  webServer: [
    {
      command: "python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8000",
      cwd: "../back",
      url: "http://127.0.0.1:8000/api/v1/health",
      reuseExistingServer: true,
      timeout: 60_000,
    },
    {
      command: "npm run dev -- --port 5174 --strictPort",
      cwd: ".",
      url: "http://127.0.0.1:5174/login",
      reuseExistingServer: true,
      timeout: 60_000,
      env: {
        VITE_HCC_API_URL: "http://127.0.0.1:8000/api/v1",
        VITE_HCC_API_MODE: "server",
        VITE_DATA_MODE: "server",
      },
    },
  ],
});
