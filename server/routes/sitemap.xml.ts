// @nuxtjs/sitemap 預設會把 /sitemap.xml 307 redirect 到 /sitemap_index.xml
// (因為 i18n 多語系自動拆成多個子 sitemap)。重導向會回 Content-Type: text/html
// 的 stub,部分爬蟲或檢測工具看到 /sitemap.xml 不是 XML 就會誤判。
// 這個 handler 把 /sitemap.xml 直接吐 sitemap_index.xml 的內容,維持 XML 回應。
export default defineEventHandler(async (event) => {
  const xml = await $fetch<string>('/sitemap_index.xml');
  setHeader(event, 'Content-Type', 'application/xml; charset=UTF-8');
  return xml;
});
