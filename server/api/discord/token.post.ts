// POST /api/discord/token
// Body: { code: string }
// Response: { access_token, refresh_token, expires_in, expires_at, token_type, scope }
//
// 初次授權後 client redirect 回來帶 ?code=...,client POST 過來 server 用 client_secret
// 跟 Discord 換 access + refresh token,然後回傳給 client 存 cookie。

import { exchangeCodeForTokens, getOAuthConfig } from '../../utils/discord';

export default defineEventHandler(async event => {
  const body = await readBody<{ code?: string }>(event);
  const code = body?.code;
  if (!code || typeof code !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'missing or invalid code' });
  }

  const cfg = getOAuthConfig();
  try {
    return await exchangeCodeForTokens(cfg, code);
  } catch (err) {
    // Discord 的錯誤訊息可能含敏感資訊,不直接回給 client,但 log 出來方便 debug
    console.error('[discord/token]', err);
    throw createError({ statusCode: 502, statusMessage: 'discord token exchange failed' });
  }
});
