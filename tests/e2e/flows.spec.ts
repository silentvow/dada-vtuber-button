import { test, expect } from '@playwright/test';

// 使用者流程 smoke test —— 不深入測互動細節,只驗主要 path 沒壞
test.describe('User flows', () => {
  test('voice button click triggers audio playback attempt', async ({ page }) => {
    // 攔截 audio element 的 play() / load(),不實際抓檔但記錄 src
    await page.addInitScript(() => {
      (window as any).__audioPlayCalls = [];
      HTMLAudioElement.prototype.play = function () {
        (window as any).__audioPlayCalls.push(this.src);
        return Promise.resolve();
      };
      // load() 後立即觸發 canplay,讓 audioStore.play 走到 audio.play()
      HTMLAudioElement.prototype.load = function () {
        setTimeout(() => this.dispatchEvent(new Event('canplay')), 0);
      };
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 等 voice button 真的有 client-side handler 才點 (Vuetify ready)
    const firstBtn = page.locator('.vo-btn').first();
    await firstBtn.waitFor({ state: 'visible' });
    await firstBtn.click();

    // poll 等 audio.play 被呼叫 (最多 3 秒)
    await expect
      .poll(async () => (await page.evaluate(() => (window as any).__audioPlayCalls?.length || 0)) > 0, {
        timeout: 3000,
        intervals: [100, 200, 500]
      })
      .toBe(true);

    const calls = await page.evaluate(() => (window as any).__audioPlayCalls || []);
    expect(calls[0]).toMatch(/(cdn\.jsdelivr\.net|\/voices\/)/);
  });

  test('VoiceBtn aria-label is the description text (not [object Object])', async ({ page }) => {
    // 對應 PR7 修的核心 bug
    await page.goto('/');
    const btns = page.locator('.vo-btn[aria-label]');
    const count = Math.min(await btns.count(), 10); // 抽前 10 個
    for (let i = 0; i < count; i++) {
      const ariaLabel = await btns.nth(i).getAttribute('aria-label');
      expect(ariaLabel).not.toBe('[object Object]');
      expect(ariaLabel?.length || 0).toBeGreaterThan(0);
    }
  });

  test('challenge page can be started', async ({ page }) => {
    await page.goto('/challenge');
    // 點 "開始挑戰" (普通難度)
    await page.getByRole('button', { name: /開始挑戰/ }).first().click();
    // 載入問題後 voice buttons 應該出現
    await page.waitForSelector('.vo-btn', { timeout: 5000 });
    const btnCount = await page.locator('.vo-btn').count();
    expect(btnCount).toBeGreaterThan(0);
  });

  test('language switcher navigates to localized URL', async ({ page }) => {
    await page.goto('/');
    // 點翻譯 icon button (用 aria-label 找)
    await page.locator('button[aria-label="切換語言"]').click();
    await page.getByText('日本語').click();
    await expect(page).toHaveURL(/\/ja\/?$/);
  });

  test('random play button triggers audio playback (PR12)', async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__audioPlayCalls = [];
      HTMLAudioElement.prototype.play = function () {
        (window as any).__audioPlayCalls.push(this.src);
        return Promise.resolve();
      };
      HTMLAudioElement.prototype.load = function () {
        setTimeout(() => this.dispatchEvent(new Event('canplay')), 0);
      };
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.locator('button[aria-label="隨機撥放"]').click();

    await expect
      .poll(async () => (await page.evaluate(() => (window as any).__audioPlayCalls?.length || 0)) > 0, {
        timeout: 3000,
        intervals: [100, 200, 500]
      })
      .toBe(true);

    const calls = await page.evaluate(() => (window as any).__audioPlayCalls || []);
    expect(calls[0]).toMatch(/\.mp3$/);
  });

  test('random play uses ALL voices, not filter-restricted (PR12)', async ({ page }) => {
    // 即使搜尋過濾掉大部分,隨機按鈕應該還是從全部 937 條挑
    await page.addInitScript(() => {
      (window as any).__audioPlayCalls = [];
      HTMLAudioElement.prototype.play = function () {
        (window as any).__audioPlayCalls.push(this.src);
        return Promise.resolve();
      };
      HTMLAudioElement.prototype.load = function () {
        setTimeout(() => this.dispatchEvent(new Event('canplay')), 0);
      };
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 搜尋一個只命中 1~2 個語音的字串
    await page.locator('input[placeholder*="搜尋"]').fill('天老爺');
    await page.waitForTimeout(400);

    // 連點隨機 10 次,應該至少有一次播到非"天老爺..."(即超出 filter 範圍)
    const playedUrls = new Set<string>();
    for (let i = 0; i < 10; i++) {
      await page.locator('button[aria-label="隨機撥放"]').click();
      await page.waitForTimeout(50);
    }
    const calls = await page.evaluate(() => (window as any).__audioPlayCalls || []);
    expect(calls.length).toBeGreaterThanOrEqual(10);
    calls.forEach((u: string) => playedUrls.add(u));
    // 10 次播放在 937 條池子裡,撞同一個的機率極低 (碰撞 ≈ 10²/937 ≈ 1%)
    // 至少要有 5 種不同的 URL 才合理 (容許一點重複)
    expect(playedUrls.size).toBeGreaterThanOrEqual(5);
  });

  test('drawer toggles on hamburger click (mobile)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    // 預設關閉 (mobile)
    const drawer = page.locator('.v-navigation-drawer');
    // 點 hamburger 開啟
    await page.locator('button[aria-label="切換選單"]').click();
    await expect(drawer).toBeVisible();
  });
});
