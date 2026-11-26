import { test, expect } from '@playwright/test';

// gtag.js 要延後到第一次互動 (或 7 秒後) 才載入,不能在首屏就和 hydration / LCP 搶資源
test.describe('Deferred gtag', () => {
  test('gtag script is not loaded at page load, only after first interaction', async ({ page }) => {
    const gtagRequests: string[] = [];
    page.on('request', req => {
      if (req.url().includes('googletagmanager.com/gtag/js')) gtagRequests.push(req.url());
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 載入完成、尚未互動:沒有 gtag script、沒有 preload,dataLayer 已排好 config 指令
    expect(gtagRequests).toHaveLength(0);
    await expect(page.locator('script[data-gtag]')).toHaveCount(0);
    await expect(page.locator('link[rel=preload][href*="googletagmanager"]')).toHaveCount(0);
    expect(await page.evaluate(() => Array.isArray((window as any).dataLayer))).toBe(true);

    // 第一次互動後才注入 gtag script
    await page.mouse.click(5, 5);
    await expect(page.locator('script[data-gtag]')).toHaveCount(1);
  });
});
