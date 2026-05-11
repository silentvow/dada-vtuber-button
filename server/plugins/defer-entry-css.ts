// 在 SSG prerender 階段,把大型 entry.css (~250KB Vuetify base) 從同步阻塞改為 preload+swap
// 小型 per-component CSS (VMenu/VContainer 等,各 < 35KB) 保持同步,避免 FOUC 嚴重化
// PSI 報告:轉譯封鎖要求 -370ms,主要來自 entry.css blocking
export default defineNitroPlugin(nitroApp => {
  nitroApp.hooks.hook('render:html', html => {
    html.head = html.head.map(line =>
      line.replace(
        /<link rel="stylesheet" href="(\/_nuxt\/entry\.[^"]+\.css)"([^>]*)>/g,
        // 用 onload swap:browser 把 preload 完成的檔案 cache 後,onload 觸發換成 stylesheet 套用
        // noscript fallback 給 JS 關閉的使用者 (CSS 不阻塞但會在 JS 解析後才套用)
        '<link rel="preload" as="style" href="$1"$2 onload="this.onload=null;this.rel=\'stylesheet\'"><noscript><link rel="stylesheet" href="$1"$2></noscript>'
      )
    );
  });
});
