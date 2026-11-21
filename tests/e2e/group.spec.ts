import { test, expect } from '@playwright/test';
import fs from 'node:fs';

const voices = JSON.parse(fs.readFileSync('public/voices.json', 'utf-8'));
const slug = (name: string) => name.replace(/_/g, '-').toLowerCase();

test.describe('Category (group) pages', () => {
  test('/group/catchphrase renders voices, SEO meta and OG image', async ({ page }) => {
    const res = await page.goto('/group/catchphrase');
    expect(res!.status()).toBe(200);
    await expect(page.locator('h1')).toContainText('口頭禪');
    await expect(page).toHaveTitle(/口頭禪.*灰妲語音博物館/);
    await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', /\/group\/catchphrase$/);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/_og\/.*\.png$/);
    // 語音按鈕有出現 (catchphrase 分類至少有一句)
    expect(await page.locator('.vo-btn').count()).toBeGreaterThan(0);
  });

  test('localized pages use localized title and hreflang alternates', async ({ page }) => {
    await page.goto('/ja/group/catchphrase');
    await expect(page.locator('h1')).toContainText('口癖');
    await expect(page).toHaveTitle(/灰妲ボイス博物館/);
    await expect(page.locator('link[hreflang="en"]')).toHaveAttribute('href', /\/en\/group\/catchphrase$/);
  });

  test('JSON-LD has CollectionPage, BreadcrumbList and ItemList', async ({ page }) => {
    await page.goto('/en/group/catchphrase');
    const ld = (await page.locator('script[type="application/ld+json"]').allTextContents()).join('');
    expect(ld).toContain('CollectionPage');
    expect(ld).toContain('BreadcrumbList');
    expect(ld).toContain('ItemList');
  });

  test('every group is prerendered for all three locales and listed in the sitemap', async ({ request }) => {
    const slugs: string[] = voices.groups.map((g: { group_name: string }) => slug(g.group_name));
    for (const prefix of ['', '/ja', '/en']) {
      for (const s of slugs) {
        const res = await request.get(`${prefix}/group/${s}`);
        expect(res.status(), `${prefix}/group/${s}`).toBe(200);
      }
    }
    const sitemap = await (await request.get('/__sitemap__/zh-TW.xml')).text();
    for (const s of slugs) expect(sitemap).toContain(`/group/${s}<`);
  });

  test('home category icon opens its own page, and group page buttons sit on a card', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // voices.json 第一個分類是 catchphrase
    await page.getByRole('link', { name: '開啟此分類頁面' }).first().click();
    await expect(page).toHaveURL(/\/group\/catchphrase$/);
    await expect(page.locator('h1')).toContainText('口頭禪');
    // 語音按鈕要放在 card 上 (之前直接放在頁面背景,按鈕顏色和背景糊在一起)
    expect(await page.locator('.v-card .vo-btn-group').count()).toBeGreaterThan(0);
  });
});
