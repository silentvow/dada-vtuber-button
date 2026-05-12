import { defineConfig, devices } from '@playwright/test';

// E2E 跑在 SSG build 後的 static output 上 (npx serve .output/public)
// 預期使用者先跑 `pnpm generate` 再跑 `pnpm test:e2e` (或在 CI 自動串)
const PORT = 4174;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false, // 共用同一個 serve,並行有時會有 flake
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 30000,

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    video: 'retain-on-failure'
  },

  // 只跑 Chromium (個人專案省 CI 時間;Vuetify SSR 在 Chromium 上代表性夠)
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ],

  // 自動 spin up serve (預期 .output/public 已 build 好)
  webServer: {
    command: `npx serve .output/public -l ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 60000
  }
});
