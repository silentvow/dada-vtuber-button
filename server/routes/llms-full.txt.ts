// 完整語音目錄,給 LLM 一次讀完;prerender 成靜態 /llms-full.txt
export default defineEventHandler(event => {
  setHeader(event, 'Content-Type', 'text/plain; charset=UTF-8');
  return buildLlmsFullTxt(useRuntimeConfig(event).public.siteUrl);
});
