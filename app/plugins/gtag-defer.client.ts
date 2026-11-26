// 延後載入 Google tag (gtag.js,~180KB,其中一大半在首屏用不到)。
//
// nuxt.config 設 gtag.initMode = 'manual' 後,模組只會在 window.dataLayer 排好 config 指令,
// 不會載入腳本;這裡等到「第一次互動」或「頁面載入後 7 秒」才真的載入,
// 避免它和 hydration / LCP 搶主執行緒與頻寬 (手機 TBT 約 -200ms)。
//
// 取捨:完全沒有互動、又在 7 秒內離開的訪客不會被 GA 記到。
// 因為事件監聽在使用者「第一次」操作時就會先載入 gtag,之後的播放事件 (gtag('event', 'play')) 不會漏。
export default defineNuxtPlugin(nuxtApp => {
  if (import.meta.dev) return;

  const { initialize } = useGtag();
  const events = ['pointerdown', 'keydown', 'touchstart', 'scroll'] as const;
  const FALLBACK_MS = 7000;
  let started = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const stop = () => {
    for (const e of events) window.removeEventListener(e, start);
    clearTimeout(timer);
  };

  function start() {
    if (started) return;
    started = true;
    stop();
    // initialize() 內部用 useHead 注入 <script>,在事件處理器裡需要手動帶回 Nuxt context
    nuxtApp.runWithContext(() => initialize());
  }

  for (const e of events) window.addEventListener(e, start, { passive: true, once: true });
  timer = setTimeout(start, FALLBACK_MS);
});
