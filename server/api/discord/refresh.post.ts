// POST /api/discord/refresh
// Body: { refresh_token: string }
// Response: { access_token, refresh_token, expires_in, expires_at, token_type, scope }
//
// Access token 過期 (或快過期) 時 client POST refresh_token 過來,
// server 用 client_secret 跟 Discord 換新的 access + (新的) refresh token。
// Discord 每次 refresh 也會給新的 refresh_token,client 要覆蓋舊的儲存。

import { refreshAccessToken, getOAuthConfig } from '../../utils/discord';

export default defineEventHandler(async event => {
  const body = await readBody<{ refresh_token?: string }>(event);
  const refreshToken = body?.refresh_token;
  if (!refreshToken || typeof refreshToken !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'missing or invalid refresh_token' });
  }

  const cfg = getOAuthConfig();
  try {
    return await refreshAccessToken(cfg, refreshToken);
  } catch (err) {
    // refresh_token 可能也已被 revoke,這時要讓 client 知道需要重新授權
    console.error('[discord/refresh]', err);
    throw createError({ statusCode: 401, statusMessage: 'refresh failed, please re-authorize' });
  }
});
