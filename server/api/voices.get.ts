import voices from '~~/public/voices.json';

// 把 voices.json 包成 server route。
// - SSG prerender: 頁面 useAsyncData -> $fetch('/api/voices') 命中此 handler,直接回傳 import 的 JSON
// - 結果寫入 _payload.json,client hydration 從 payload 反序列化,不再 refetch
// - JSON 不會出現在 client JS bundle (只在 server bundle,build 後丟棄)
export default defineEventHandler(() => voices);
