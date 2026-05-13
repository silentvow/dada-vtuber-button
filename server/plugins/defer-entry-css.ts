// 兩件事一個 plugin (都在 render:html hook 處理):
//
// 1. defer entry.css (PR9): 大型 entry.css (~250KB Vuetify base) 從同步阻塞改成 preload+swap
//    PSI 報告:轉譯封鎖要求 -370ms。
//
// 2. inject layout + page CSS as <link rel="stylesheet"> (PR14):
//    Nuxt 預設把 layout (default.*.css) 跟 page (index.*.css / favorite.*.css ...) CSS 包進
//    JS chunk 用 dynamic import。結果是這些版面樣式比 HTML 晚很多到 → 首屏大 FOUC,
//    Slow 3G 上 CLS 飆到 0.81 (Good < 0.1)。
//
//    把它們提到 head 變成 <link rel="stylesheet">,讓 browser 跟 HTML 平行下載。
//    這些檔案總大小 ~40KB (gzip ~7KB),不會明顯擋 LCP (對比 entry.css 250KB 是延遲的)。
import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// 啟動時掃一次 build 出來的 css 名單,後續每個請求直接查表 (build hash 不變)
let cssMap: { layout: string | null; pages: Record<string, string> } | null = null;

function loadCssMap() {
  if (cssMap) return cssMap;

  // SSG prerender 是在 build 過程中,.output/public/ 還沒生成,
  // CSS chunk 此時在 vite client build cache 裡。兩個位置都試。
  const candidates = [
    join(process.cwd(), 'node_modules/.cache/nuxt/.nuxt/dist/client/_nuxt'),
    join(process.cwd(), '.output/public/_nuxt')
  ];
  const nuxtDir = candidates.find(p => existsSync(p));
  if (!nuxtDir) {
    cssMap = { layout: null, pages: {} };
    return cssMap;
  }

  const files = readdirSync(nuxtDir).filter(f => f.endsWith('.css'));
  const layout = files.find(f => f.startsWith('default.')) || null;
  const pages: Record<string, string> = {};
  // 已知的 page CSS prefix (與 app/pages/ 檔案名對應)
  for (const name of ['index', 'favorite', 'challenge', 'feedback', 'privacy', 'member']) {
    const f = files.find(file => file.startsWith(`${name}.`));
    if (f) pages[name] = f;
  }
  cssMap = { layout, pages };
  return cssMap;
}

// 路由 → page key 的對應 (i18n prefix 也要對到同一個 page)
function getPageKey(url: string): string {
  const path = url.replace(/^\/(en|ja)\//, '/').replace(/^\/(en|ja)$/, '/');
  if (path === '/' || path === '') return 'index';
  const match = path.match(/^\/([a-z]+)\/?$/);
  return match?.[1] || 'index';
}

export default defineNitroPlugin(nitroApp => {
  nitroApp.hooks.hook('render:html', (html, ctx) => {
    // === 1. entry.css preload+swap ===
    html.head = html.head.map(line =>
      line.replace(
        /<link rel="stylesheet" href="(\/_nuxt\/entry\.[^"]+\.css)"([^>]*)>/g,
        // onload swap:browser cache 後 onload 觸發換成 stylesheet 套用
        // noscript fallback 給 JS disable 的使用者
        '<link rel="preload" as="style" href="$1"$2 onload="this.onload=null;this.rel=\'stylesheet\'"><noscript><link rel="stylesheet" href="$1"$2></noscript>'
      )
    );

    // === 2. inject layout + page CSS ===
    const map = loadCssMap();
    if (!map.layout) return; // build 還沒跑或找不到,跳過 (dev mode 不會經過這裡)

    const url = (ctx as any)?.event?.path || '';
    const pageKey = getPageKey(url);
    const pageCss = map.pages[pageKey];

    // 已經在 head 裡的不重複加 (避免跟未來 Nuxt 行為衝突)
    const headStr = html.head.join('');
    const inject: string[] = [];
    if (!headStr.includes(map.layout)) {
      inject.push(`<link rel="stylesheet" href="/_nuxt/${map.layout}" crossorigin>`);
    }
    if (pageCss && !headStr.includes(pageCss)) {
      inject.push(`<link rel="stylesheet" href="/_nuxt/${pageCss}" crossorigin>`);
    }
    if (inject.length) {
      html.head.push(inject.join(''));
    }
  });
});
