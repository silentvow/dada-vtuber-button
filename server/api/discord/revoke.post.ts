// POST /api/discord/revoke
// Body: { token: string, token_type_hint?: 'access_token' | 'refresh_token' }
// Response: 204 No Content (即使 revoke 失敗也回 204,不擋 client logout 流程)
//
// Logout 時 client 順便通知 Discord 把 token 作廢,避免遺留 token 被誤用。
// 失敗不該影響 client UX (cookie 反正會被清掉),所以即使 Discord 回 error 也吞掉。

import { revokeToken, getOAuthConfig } from '../../utils/discord';

export default defineEventHandler(async event => {
  const body = await readBody<{ token?: string; token_type_hint?: 'access_token' | 'refresh_token' }>(event);
  const token = body?.token;
  const hint = body?.token_type_hint === 'refresh_token' ? 'refresh_token' : 'access_token';
  if (!token || typeof token !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'missing or invalid token' });
  }

  try {
    const cfg = getOAuthConfig();
    await revokeToken(cfg, token, hint);
  } catch (err) {
    // 寫 log 但不 throw,client logout 不該被擋
    console.error('[discord/revoke]', err);
  }
  setResponseStatus(event, 204);
  return null;
});
