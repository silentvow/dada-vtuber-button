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

  test('random play: button loading + snackbar on play start, both clear on end (PR12)', async ({ page }) => {
    // 控制 canplay 觸發時機,讓我們能驗證:
    // - 按下後到 canplay 之間 button 顯示 loading
    // - canplay 之後 snackbar 才出現 (不是按下就出現)
    // - audio ended 之後 button 退出 loading + snackbar 消失
    await page.addInitScript(() => {
      (window as any).__audioPlayCalls = [];
      (window as any).__audioElements = [];
      HTMLAudioElement.prototype.play = function () {
        (window as any).__audioPlayCalls.push(this.src);
        return Promise.resolve();
      };
      HTMLAudioElement.prototype.load = function () {
        (window as any).__audioElements.push(this);
        // 不自動觸發 canplay,由 test 手動觸發
      };
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const randomBtn = page.locator('button[aria-label="隨機撥放"]');
    await randomBtn.click();

    // 按下後 button 應該 loading (v-btn loading class)
    await expect(randomBtn).toHaveClass(/v-btn--loading/);
    // snackbar 還沒出現 (因為 canplay 還沒觸發)
    await expect(page.locator('.v-snackbar--active')).toHaveCount(0);

    // 模擬 canplay 觸發 — 給 audios[0] (jsdelivr,第一個 racer) 讓它贏 race
    // (PR13 race 之後 audios array 會被 loser abort 的 load() 再 push,
    //  audios[length-1] 不一定是 winner;audios[0] 是穩定的第一個 racer)
    await page.evaluate(() => {
      const audios = (window as any).__audioElements;
      audios[0]?.dispatchEvent(new Event('canplay'));
    });

    // 現在 snackbar 應該出現,含「播放中」
    await expect(page.locator('.v-snackbar--active')).toContainText('播放中');

    // 模擬 audio ended (對 winner = audios[0] 派發)
    await page.evaluate(() => {
      const audios = (window as any).__audioElements;
      audios[0]?.dispatchEvent(new Event('ended'));
    });

    // button loading 退出, snackbar 消失
    await expect(randomBtn).not.toHaveClass(/v-btn--loading/);
    await expect(page.locator('.v-snackbar--active')).toHaveCount(0);

    // 確認 audio.play() 真的被呼叫過
    const calls = await page.evaluate(() => (window as any).__audioPlayCalls || []);
    expect(calls[0]).toMatch(/\.mp3$/);
  });

  test('random play uses ALL voices, not filter-restricted (PR12)', async ({ page }) => {
    // 即使搜尋過濾掉大部分,隨機按鈕應該還是從全部 937 條挑
    // 注意:按鈕現在有 loading state,要 audio ended 才能再點下一次,
    // 所以 mock load() 立即觸發 canplay 後再觸發 ended 模擬「瞬間播完」
    await page.addInitScript(() => {
      (window as any).__audioPlayCalls = [];
      HTMLAudioElement.prototype.play = function () {
        (window as any).__audioPlayCalls.push(this.src);
        return Promise.resolve();
      };
      HTMLAudioElement.prototype.load = function () {
        setTimeout(() => {
          this.dispatchEvent(new Event('canplay'));
          // 立即觸發 ended,模擬瞬間播完,讓 button loading 解除
          setTimeout(() => this.dispatchEvent(new Event('ended')), 5);
        }, 0);
      };
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 搜尋一個只命中 1~2 個語音的字串
    await page.locator('input[placeholder*="搜尋"]').fill('天老爺');
    await page.waitForTimeout(400);

    const randomBtn = page.locator('button[aria-label="隨機撥放"]');

    // 連點隨機 10 次 (等 button loading 解除才能點下一次)
    for (let i = 0; i < 10; i++) {
      await expect(randomBtn).not.toHaveClass(/v-btn--loading/, { timeout: 1000 });
      await randomBtn.click();
      await page.waitForTimeout(30);
    }
    await page.waitForTimeout(100);
    const calls = await page.evaluate(() => (window as any).__audioPlayCalls || []);
    expect(calls.length).toBeGreaterThanOrEqual(10);
    const playedUrls = new Set<string>(calls);
    // 10 次播放在 937 條池子裡,撞同一個的機率極低 (碰撞 ≈ 10²/937 ≈ 1%)
    // 至少要有 5 種不同的 URL 才合理 (容許一點重複)
    expect(playedUrls.size).toBeGreaterThanOrEqual(5);
  });

  test('CDN race: all URLs are requested, only one play() call per click (PR13)', async ({ page }) => {
    // E2E 跑在 prod build 上 → audioStore 應對 jsdelivr + raw.github + gh-pages 同時發 race
    // 三個 Audio 都會 load(),但 declareWinner 內有 guard → 只有一個 play()
    await page.addInitScript(() => {
      (window as any).__loadedUrls = [];
      (window as any).__playCalls = [];
      HTMLAudioElement.prototype.play = function () {
        (window as any).__playCalls.push(this.src);
        return Promise.resolve();
      };
      HTMLAudioElement.prototype.load = function () {
        (window as any).__loadedUrls.push(this.src);
        // 同步觸發 canplay,確保第一個 (jsdelivr) 贏 race
        setTimeout(() => this.dispatchEvent(new Event('canplay')), 0);
      };
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const firstBtn = page.locator('.vo-btn').first();
    await firstBtn.waitFor({ state: 'visible' });
    await firstBtn.click();

    await expect
      .poll(async () => (await page.evaluate(() => (window as any).__playCalls?.length || 0)) > 0, {
        timeout: 3000,
        intervals: [100, 200, 500]
      })
      .toBe(true);

    const loaded = await page.evaluate(() => (window as any).__loadedUrls || []);
    const played = await page.evaluate(() => (window as any).__playCalls || []);

    // load() 應該被叫多次:race 階段每個 racer 各一次,winner 宣告後 losers abort 又各一次
    expect(loaded.length).toBeGreaterThanOrEqual(3);
    // 但 play() 只應該被叫一次 (winner)
    expect(played.length).toBe(1);
    // winner URL 應該是 jsdelivr (race 中第一個 canplay)
    expect(played[0]).toMatch(/cdn\.jsdelivr\.net/);
  });

  test('CDN race: all racers fail → error snackbar shown (PR13)', async ({ page }) => {
    // 所有 racer 都 error 才視為真的失敗 → 跑 errorSnackbar 路徑
    await page.addInitScript(() => {
      (window as any).__playCalls = [];
      HTMLAudioElement.prototype.play = function () {
        (window as any).__playCalls.push(this.src);
        return Promise.resolve();
      };
      HTMLAudioElement.prototype.load = function () {
        // 不觸發 canplay,改觸發 error
        setTimeout(() => this.dispatchEvent(new Event('error')), 0);
      };
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const firstBtn = page.locator('.vo-btn').first();
    await firstBtn.waitFor({ state: 'visible' });
    await firstBtn.click();

    // 全部 racer 都 error → 應該出現錯誤 snackbar
    await expect(page.locator('.v-snackbar--active')).toBeVisible({ timeout: 3000 });
    // play() 不應該被呼叫 (沒有 winner)
    const played = await page.evaluate(() => (window as any).__playCalls || []);
    expect(played.length).toBe(0);
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
