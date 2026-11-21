import voices from '~~/public/voices.json';
import { groupSlug } from '~~/shared/utils/groupSlug';

// 單一分類的資料。分類頁每頁只帶自己的語音進 payload (而不是整份 ~800KB voices.json),
// 165 個 prerender 頁面才不會每頁都肥。
export default defineEventHandler(event => {
  const slug = getRouterParam(event, 'slug');
  const group = (voices as { groups: Array<{ group_name: string }> }).groups.find(
    g => groupSlug(g.group_name) === slug
  );
  if (!group) throw createError({ statusCode: 404, statusMessage: 'Group not found' });
  return group;
});
