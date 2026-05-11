import voices from '~~/public/dc_voices.json';

// 同 voices.get.ts:server route 用 import 直接讀檔
// member 頁是 client-only (ssr:false),這個 endpoint 主要給 client 端 $fetch 使用
export default defineEventHandler(() => voices);
