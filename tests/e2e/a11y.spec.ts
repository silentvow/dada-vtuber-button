import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// 跑 axe-core 在每個預渲染頁面 (5 路由 × 3 語系 = 15 頁)
// 對應實際發生過的 a11y 失敗 (PR7 / PR9b):
//   - VoiceBtn aria-label = "[object Object]" (937 個按鈕)
//   - 4 個 nav icon button 缺 accessible name
//   - v-list role=list 內含 role=link (ARIA hierarchy)
//   - v-tooltip 外層 role=tooltip 缺 aria-label

const paths = [
  '/',
  '/favorite',
  '/challenge',
  '/privacy',
  '/ja',
  '/ja/favorite',
  '/ja/challenge',
  '/ja/privacy',
  '/en',
  '/en/favorite',
  '/en/challenge',
  '/en/privacy'
];

for (const path of paths) {
  test(`a11y: ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState('domcontentloaded');

    const results = await new AxeBuilder({ page })
      // 排除 WCAG AAA 等過嚴等級,只跑 A 跟 AA
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    // axe 失敗時把違規列出來方便 debug
    if (results.violations.length > 0) {
      console.error(
        `Violations on ${path}:`,
        results.violations.map(v => ({
          id: v.id,
          impact: v.impact,
          help: v.help,
          nodes: v.nodes.slice(0, 3).map(n => n.html.slice(0, 80))
        }))
      );
    }

    expect(results.violations).toEqual([]);
  });
}
