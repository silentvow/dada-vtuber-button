import { defineConfig, devices } from '@playwright/test';

// E2E 跑在 Vercel preset build 後的 static output 上 (npx serve .vercel/output/static)
// 預期使用者先跑 `pnpm generate` 再跑 `pnpm test:e2e` (或在 CI 自動串)
// 注意:nitro preset='vercel' 之後輸出位置從 .output/public 移到 .vercel/output/static。
// API routes (例如 /api/discord/token) 在這個 static serve 下不可用,要打 API 的測試需
// 用 vercel dev 或 nuxt dev。本專案 API 邏輯由 unit test (tests/unit/discordOAuth.test.ts) 覆蓋。
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
    command: `npx serve .vercel/output/static -l ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 60000
  }
});
