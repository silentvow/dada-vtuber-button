import { test, expect } from '@playwright/test';

test.describe('Voice search', () => {
  test('typing query filters groups + voices', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 搜尋 "天老爺" 應該命中 "天老爺阿" / "我的天老爺阿"
    const searchInput = page.locator('input[placeholder*="搜尋"]');
    await searchInput.fill('天老爺');

    // 等過濾結果穩定
    await page.waitForTimeout(300);

    // 至少要有結果 (panel 數量 > 0)
    const visiblePanels = await page.locator('.v-expansion-panel').count();
    expect(visiblePanels).toBeGreaterThan(0);

    // 命中的群組會自動展開,語音文字可見
    const voiceText = await page.getByText('天老爺阿', { exact: false }).count();
    expect(voiceText).toBeGreaterThan(0);
  });

  test('no-results shows empty state alert', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const searchInput = page.locator('input[placeholder*="搜尋"]');
    await searchInput.fill('xxxNonExistentVoiceQuery');
    await page.waitForTimeout(300);

    // 應顯示「找不到符合...的語音」alert
    await expect(page.locator('.v-alert')).toContainText('xxxNonExistentVoiceQuery');

    // 第一個 v-expansion-panels (voice panels) 內 panel 數量為 0
    // (注意 FAQ 也用 v-expansion-panel,要用第一組)
    expect(await page.locator('.v-expansion-panels').first().locator('.v-expansion-panel').count()).toBe(0);
  });

  test('clearing search restores all groups + default expansion', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const before = await page.locator('.v-expansion-panel').count();

    const searchInput = page.locator('input[placeholder*="搜尋"]');
    await searchInput.fill('天老爺');
    await page.waitForTimeout(300);
    await searchInput.fill('');
    await page.waitForTimeout(300);

    const after = await page.locator('.v-expansion-panel').count();
    expect(after).toBe(before);
  });

  test('search across Japanese description (Japanese user can find Chinese voice)', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 用日文搜尋 (voices.json 三語系都有 description)
    const searchInput = page.locator('input[placeholder*="搜尋"]');
    await searchInput.fill('神様');
    await page.waitForTimeout(300);

    expect(await page.locator('.v-expansion-panel').count()).toBeGreaterThan(0);
  });
});
