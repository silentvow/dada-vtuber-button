// 語音分類 (voices.json 的 group_name) → 網址 slug。
// group_name 全部唯一,只含小寫英數與底線,底線換成連字號即可。
// 放在 shared/ 讓 app、server 與 nuxt.config 都能 import。
export const groupSlug = (groupName: string) => groupName.replace(/_/g, '-').toLowerCase();
