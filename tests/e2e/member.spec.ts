import { test, expect } from '@playwright/test';

// 會員頁 (/member) regression — PR8 改 /api/dc_voices 是 server route,
// 但 member 是 ssr:false + 不被 prerender,client runtime 真的會打那個 endpoint,
// SSG 靜態 hosting 上 → 404,整頁拿不到 voices 資料。
// PR17 把它改成 fetch 靜態 /dc_voices.json。
// 這個 spec 監視 page 載入過程不能有 404 + 載入後資料存在 (voice_lists.groups.length > 0)。

test.describe('Member page (ssr:false)', () => {
  test('navigates from drawer + dc_voices loads without 404', async ({ page }) => {
    // 監聽 failed network requests
    const failedRequests: string[] = [];
    page.on('response', async res => {
      if (!res.ok() && res.status() >= 400) {
        const url = res.url();
        // 只關心我們自己的 endpoint,Discord OAuth API 失敗是預期的 (沒登入)
        if (url.includes('/api/') || url.includes('/dc_voices')) {
          failedRequests.push(`${res.status()} ${url}`);
        }
      }
    });

    // 從首頁開始 (member 直接 URL 在 ignore 不會有 stub HTML,
    // 必須用 SPA 內部路由跳過去)
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // drawer 點「會員專區」
    const memberLink = page.getByRole('link', { name: /會員專區/ });
    await memberLink.click();
    await expect(page).toHaveURL(/\/member\/?$/);
    await page.waitForLoadState('networkidle');

    // 給 useAsyncData 一點時間完成
    await page.waitForTimeout(500);

    // 不能有 dc_voices 相關的 404
    const dcVoicesErrors = failedRequests.filter(r => r.includes('dc_voices'));
    expect(dcVoicesErrors, `unexpected failed requests:\n${dcVoicesErrors.join('\n')}`).toEqual([]);

    // 頁面標題 / 主要元件存在 (Discord 未登入,所以會顯示 error alert + 「連結 Discord 帳號」按鈕)
    await expect(page.getByText(/會員專區/).first()).toBeVisible();
  });

  test('dc_voices.json static file is accessible at runtime', async ({ request }) => {
    const res = await request.get('/dc_voices.json');
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.groups).toBeDefined();
    expect(data.groups.length).toBeGreaterThan(0);
  });
});
