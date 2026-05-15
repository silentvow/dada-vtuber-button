import { test, expect } from '@playwright/test';

// Soundboard (PR16) — 給實況主的快速播放工具
//
// 注意:HTML5 drag-and-drop 在 Playwright 上很難可靠模擬 (尤其用 native drag events),
// 改用直接寫 cookie / 點擊 / 鍵盤事件來驗 store 跟 UI 行為。
// 拖曳本身的 store action (setSlot) 由 unit test 覆蓋。

test.describe('Soundboard page', () => {
  test('desktop: initial state shows 9 empty slots + voice grid + toggle', async ({ page, context }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await context.clearCookies();
    await page.goto('/soundboard');
    await page.waitForLoadState('networkidle');

    // 9 個 slots
    await expect(page.locator('.soundboard-slot')).toHaveCount(9);
    // 都是空的 (有 empty class)
    await expect(page.locator('.soundboard-slot-empty')).toHaveCount(9);
    // Overlap toggle visible (預設 ON)
    const overlapBtn = page.getByRole('button', { name: /疊播/ });
    await expect(overlapBtn).toBeVisible();
    await expect(overlapBtn).toHaveAttribute('aria-pressed', 'true');
    // 回主站連結
    await expect(page.getByRole('link', { name: /回主站/ })).toBeVisible();
    // Voice grid 有 buttons (至少很多)
    const voiceBtns = page.locator('.soundboard-voice-btn');
    expect(await voiceBtns.count()).toBeGreaterThan(50);
  });

  test('mobile: shows hint instead of soundboard UI', async ({ page, context }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await context.clearCookies();
    await page.goto('/soundboard');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('建議使用桌面瀏覽器')).toBeVisible();
    // Soundboard 主介面不應該出現
    await expect(page.locator('.soundboard-slots')).toHaveCount(0);
    // 回主站按鈕在
    await expect(page.getByRole('link', { name: /回主站/ })).toBeVisible();
  });

  test('toggle overlap: aria-pressed flips', async ({ page, context }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await context.clearCookies();
    await page.goto('/soundboard');
    await page.waitForLoadState('networkidle');

    const overlapBtn = page.getByRole('button', { name: /疊播/ });
    await expect(overlapBtn).toHaveAttribute('aria-pressed', 'true');
    await overlapBtn.click();
    await expect(overlapBtn).toHaveAttribute('aria-pressed', 'false');
    await overlapBtn.click();
    await expect(overlapBtn).toHaveAttribute('aria-pressed', 'true');
  });

  test('search filters voice grid', async ({ page, context }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await context.clearCookies();
    await page.goto('/soundboard');
    await page.waitForLoadState('networkidle');

    const initialCount = await page.locator('.soundboard-voice-btn').count();
    expect(initialCount).toBeGreaterThan(50);

    // 搜尋一個很短的字串應該縮減結果
    await page.getByPlaceholder(/搜尋語音/).fill('天');
    await page.waitForTimeout(300);
    const filteredCount = await page.locator('.soundboard-voice-btn').count();
    expect(filteredCount).toBeLessThan(initialCount);
    expect(filteredCount).toBeGreaterThan(0);
  });

  test('pinned slot displays voice name + clicking it plays', async ({ page, context }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await context.clearCookies();
    await page.addInitScript(() => {
      (window as any).__playCalls = [];
      HTMLAudioElement.prototype.play = function () {
        (window as any).__playCalls.push(this.src);
        return Promise.resolve();
      };
      HTMLAudioElement.prototype.load = function () {
        setTimeout(() => this.dispatchEvent(new Event('canplay')), 0);
      };
    });

    // 先到主站拿 voice id
    await page.goto('/');
    const voiceIds = await page.evaluate(async () => {
      const data = await (await fetch('/voices.json')).json();
      return data.groups[0].voice_list.slice(0, 2).map((v: any) => v.id);
    });

    // 寫 soundboard cookie
    await context.addCookies([
      {
        name: 'soundboard',
        value: encodeURIComponent(
          JSON.stringify({
            pinnedSlots: [voiceIds[0], voiceIds[1], null, null, null, null, null, null, null],
            overlap: true
          })
        ),
        url: 'http://localhost:4174'
      }
    ]);

    await page.goto('/soundboard');
    await page.waitForLoadState('networkidle');

    // 前兩個 slot 應該不再是 empty (沒有 -empty class)
    await expect(page.locator('.soundboard-slot').nth(0)).not.toHaveClass(/soundboard-slot-empty/);
    await expect(page.locator('.soundboard-slot').nth(1)).not.toHaveClass(/soundboard-slot-empty/);
    await expect(page.locator('.soundboard-slot').nth(2)).toHaveClass(/soundboard-slot-empty/);

    // 點第一個 slot 應該觸發 audio.play()
    await page.locator('.soundboard-slot').nth(0).click();
    await expect
      .poll(async () => (await page.evaluate(() => (window as any).__playCalls?.length || 0)) > 0, {
        timeout: 3000
      })
      .toBe(true);
  });

  test('keyboard 1-9: triggers pinned slot play', async ({ page, context }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await context.clearCookies();
    await page.addInitScript(() => {
      (window as any).__playCalls = [];
      HTMLAudioElement.prototype.play = function () {
        (window as any).__playCalls.push(this.src);
        return Promise.resolve();
      };
      HTMLAudioElement.prototype.load = function () {
        setTimeout(() => this.dispatchEvent(new Event('canplay')), 0);
      };
    });

    await page.goto('/');
    const voiceIds = await page.evaluate(async () => {
      const data = await (await fetch('/voices.json')).json();
      return data.groups[0].voice_list.slice(0, 1).map((v: any) => v.id);
    });
    await context.addCookies([
      {
        name: 'soundboard',
        value: encodeURIComponent(
          JSON.stringify({
            pinnedSlots: [voiceIds[0], null, null, null, null, null, null, null, null],
            overlap: true
          })
        ),
        url: 'http://localhost:4174'
      }
    ]);

    await page.goto('/soundboard');
    await page.waitForLoadState('networkidle');

    // 按 1 鍵 (頁面 body 有 focus)
    await page.locator('body').click();
    await page.keyboard.press('1');
    await expect
      .poll(async () => (await page.evaluate(() => (window as any).__playCalls?.length || 0)) > 0, {
        timeout: 3000
      })
      .toBe(true);
  });

  test('keyboard 1-9: NOT triggered when typing in search input', async ({ page, context }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await context.clearCookies();
    await page.addInitScript(() => {
      (window as any).__playCalls = [];
      HTMLAudioElement.prototype.play = function () {
        (window as any).__playCalls.push(this.src);
        return Promise.resolve();
      };
    });

    await page.goto('/');
    const voiceIds = await page.evaluate(async () => {
      const data = await (await fetch('/voices.json')).json();
      return data.groups[0].voice_list.slice(0, 1).map((v: any) => v.id);
    });
    await context.addCookies([
      {
        name: 'soundboard',
        value: encodeURIComponent(
          JSON.stringify({
            pinnedSlots: [voiceIds[0], null, null, null, null, null, null, null, null],
            overlap: true
          })
        ),
        url: 'http://localhost:4174'
      }
    ]);
    await page.goto('/soundboard');
    await page.waitForLoadState('networkidle');

    // Focus 搜尋輸入框
    await page.getByPlaceholder(/搜尋語音/).focus();
    await page.keyboard.press('1');
    // play() 不應該被觸發 (按鍵被當打字)
    await page.waitForTimeout(200);
    const calls = await page.evaluate(() => (window as any).__playCalls?.length || 0);
    expect(calls).toBe(0);
  });

  test('clear all button removes all pinned slots', async ({ page, context }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await context.clearCookies();

    await page.goto('/');
    const voiceIds = await page.evaluate(async () => {
      const data = await (await fetch('/voices.json')).json();
      return data.groups[0].voice_list.slice(0, 2).map((v: any) => v.id);
    });
    await context.addCookies([
      {
        name: 'soundboard',
        value: encodeURIComponent(
          JSON.stringify({
            pinnedSlots: [voiceIds[0], voiceIds[1], null, null, null, null, null, null, null],
            overlap: true
          })
        ),
        url: 'http://localhost:4174'
      }
    ]);
    await page.goto('/soundboard');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('.soundboard-slot-empty')).toHaveCount(7);
    await page.getByRole('button', { name: /全部清空/ }).click();
    await expect(page.locator('.soundboard-slot-empty')).toHaveCount(9);
  });
});

test.describe('Soundboard footer link from home', () => {
  test('footer has 實況工具 link to /soundboard', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const footerLink = page.getByRole('link', { name: '實況工具' });
    await expect(footerLink).toBeVisible();
    await footerLink.click();
    await expect(page).toHaveURL(/\/soundboard\/?$/);
  });
});
