// 由 voices.json 產生 (見 server/utils/llms.ts),prerender 成靜態 /llms.txt
export default defineEventHandler(event => {
  setHeader(event, 'Content-Type', 'text/plain; charset=UTF-8');
  return buildLlmsTxt(useRuntimeConfig(event).public.siteUrl);
});
