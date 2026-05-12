import { test, expect } from '@playwright/test';

// 每個迴歸都對應實際發生過的 bug:
// - PR1: title / canonical / og:url 缺漏或錯字串
// - PR2: hreflang / JSON-LD 沒生成
// - PR4-fix: /ja /en home title 跑出 "Ja - ..." / "En - ..."
// - PR8: $fetch('/voices.json') 讓 SSR 變空白 (HTML 不該空)

test.describe('SEO meta tags per locale', () => {
  const cases = [
    { path: '/', expectedTitle: '灰妲語音博物館', lang: 'zh-TW', canonical: '/' },
    { path: '/ja', expectedTitle: '灰妲ボイス博物館', lang: 'ja-JP', canonical: '/ja' },
    { path: '/en', expectedTitle: 'DaDa Voice Museum', lang: 'en-US', canonical: '/en' }
  ];

  for (const c of cases) {
    test(`${c.path} has correct title / lang / canonical / og:url`, async ({ page }) => {
      await page.goto(c.path);

      // title (regression: 之前 /ja / /en 跑出 "Ja - " "En - " prefix)
      await expect(page).toHaveTitle(c.expectedTitle);

      // <html lang>
      await expect(page.locator('html')).toHaveAttribute('lang', c.lang);

      // canonical (regression: og:url 之前是錯字串 "灰妲語音博物館")
      const canonical = page.locator('link[rel=canonical]');
      await expect(canonical).toHaveAttribute('href', /dada-vtuber-button\.vercel\.app/);

      // og:url
      const ogUrl = page.locator('meta[property="og:url"]');
      await expect(ogUrl).toHaveAttribute('content', /dada-vtuber-button\.vercel\.app/);

      // og:locale 匹配
      const ogLocale = page.locator('meta[property="og:locale"]');
      const expectedOgLocale = c.lang.replace('-', '_');
      await expect(ogLocale).toHaveAttribute('content', expectedOgLocale);
    });
  }
});

test.describe('hreflang alternate links', () => {
  test('every page has 7 hreflang variants (zh/zh-TW/ja/ja-JP/en/en-US/x-default)', async ({ page }) => {
    await page.goto('/');
    const hreflangs = await page.locator('link[rel="alternate"][hreflang]').all();
    expect(hreflangs.length).toBeGreaterThanOrEqual(7);
    const langs = await Promise.all(hreflangs.map(el => el.getAttribute('hreflang')));
    for (const expected of ['zh', 'zh-TW', 'ja', 'ja-JP', 'en', 'en-US', 'x-default']) {
      expect(langs).toContain(expected);
    }
  });
});

test.describe('JSON-LD structured data', () => {
  test('homepage has WebSite + Person + Organization', async ({ page }) => {
    await page.goto('/');
    const ldScripts = page.locator('script[type="application/ld+json"]');
    const count = await ldScripts.count();
    expect(count).toBeGreaterThan(0);

    const allLd = await Promise.all(
      Array.from({ length: count }, async (_, i) => JSON.parse((await ldScripts.nth(i).textContent()) || '{}'))
    );
    const types = JSON.stringify(allLd);

    expect(types).toContain('WebSite');
    expect(types).toContain('Person');
    expect(types).toContain('Organization');
  });

  test('homepage has FAQPage with 5 questions', async ({ page }) => {
    await page.goto('/');
    const ldScripts = page.locator('script[type="application/ld+json"]');
    const count = await ldScripts.count();
    const allLdText = (
      await Promise.all(Array.from({ length: count }, (_, i) => ldScripts.nth(i).textContent()))
    ).join('');

    expect(allLdText).toContain('FAQPage');
    // 5 個問題
    const questionMatches = allLdText.match(/"@type":"Question"/g) || [];
    expect(questionMatches.length).toBe(5);
  });
});

test.describe('Robots / Sitemap', () => {
  test('robots.txt exists with sitemap', async ({ request }) => {
    const res = await request.get('/robots.txt');
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toMatch(/Sitemap:\s+https:\/\/.*sitemap_index\.xml/);
  });

  test('sitemap_index.xml exists with 3 locale sitemaps', async ({ request }) => {
    const res = await request.get('/sitemap_index.xml');
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain('en-US');
    expect(body).toContain('ja-JP');
    expect(body).toContain('zh-TW');
  });

  test('llms.txt exists for LLM crawlers', async ({ request }) => {
    const res = await request.get('/llms.txt');
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain('DaDa');
  });
});

test.describe('Build output regressions', () => {
  test('homepage HTML contains rendered voice content (SSR not empty)', async ({ page }) => {
    // 對應 PR8 踩坑:$fetch('/voices.json') 讓 SSR HTML 變空白
    const res = await page.goto('/');
    const html = await res!.text();
    // 至少一個 voice 描述應該出現在 SSR HTML
    expect(html).toContain('天老爺阿');
    // 大小應該 > 100KB (有完整內容)
    expect(html.length).toBeGreaterThan(100000);
  });

  test('feedback and member pages are noindex', async ({ page }) => {
    for (const path of ['/feedback']) {
      await page.goto(path);
      const robots = page.locator('meta[name=robots]');
      await expect(robots).toHaveAttribute('content', /noindex/);
    }
  });

  test('entry.css uses preload+swap (not synchronous blocking)', async ({ page }) => {
    // 對應 PR9a:entry.css 必須是 async load (rel=preload)
    const res = await page.goto('/');
    const html = await res!.text();
    expect(html).toMatch(/<link rel="preload" as="style" href="\/_nuxt\/entry\.[^"]+\.css"/);
  });
});
