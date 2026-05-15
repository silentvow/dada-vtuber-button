// Discord OAuth2 token exchange / refresh / revoke helpers.
//
// 抽到 server/utils 是為了:
// 1. 共用邏輯不重複 (token / refresh 都用 application/x-www-form-urlencoded + Basic auth)
// 2. 可注入 fetcher 做 unit test (避免真的打 Discord API)
//
// Discord 文件: https://docs.discord.com/developers/topics/oauth2

export interface DiscordTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number; // 秒,Discord 預設 604800 (7 天)
  token_type: string; // "Bearer"
  scope: string;
}

export interface DiscordOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  apiBase: string; // e.g. "https://discord.com/api"
}

// 我們回給 client 的格式 — 多加 expires_at 方便 client 算 expiry,不用各自重算
export interface NormalizedTokenResponse extends DiscordTokenResponse {
  expires_at: number; // ms unix timestamp,計算過後給 client 直接用
}

type Fetcher = typeof globalThis.fetch;

function basicAuthHeader(id: string, secret: string): string {
  // Buffer 在 Node、btoa 在 browser/edge runtime,server-side 用 Buffer
  return 'Basic ' + Buffer.from(`${id}:${secret}`).toString('base64');
}

async function postTokenEndpoint(
  cfg: DiscordOAuthConfig,
  params: URLSearchParams,
  fetcher: Fetcher = fetch
): Promise<DiscordTokenResponse> {
  const res = await fetcher(`${cfg.apiBase}/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: basicAuthHeader(cfg.clientId, cfg.clientSecret)
    },
    body: params.toString()
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`discord oauth error ${res.status}: ${text.slice(0, 200)}`);
  }
  return (await res.json()) as DiscordTokenResponse;
}

// 用 authorization code 換取 access + refresh token (initial 授權之後呼叫)
export async function exchangeCodeForTokens(
  cfg: DiscordOAuthConfig,
  code: string,
  fetcher: Fetcher = fetch
): Promise<NormalizedTokenResponse> {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: cfg.redirectUri
  });
  const data = await postTokenEndpoint(cfg, params, fetcher);
  return { ...data, expires_at: Date.now() + data.expires_in * 1000 };
}

// 用 refresh token 換新的 access token (access 過期時呼叫)
// Discord 每次 refresh 也會回傳新的 refresh_token,client 應該覆蓋舊的
export async function refreshAccessToken(
  cfg: DiscordOAuthConfig,
  refreshToken: string,
  fetcher: Fetcher = fetch
): Promise<NormalizedTokenResponse> {
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken
  });
  const data = await postTokenEndpoint(cfg, params, fetcher);
  return { ...data, expires_at: Date.now() + data.expires_in * 1000 };
}

// 取消授權 token (logout 時呼叫,讓 Discord 端也失效)
// 注意:revoke 不返回有用資訊,失敗也不該擋 client logout
export async function revokeToken(
  cfg: DiscordOAuthConfig,
  token: string,
  tokenTypeHint: 'access_token' | 'refresh_token' = 'access_token',
  fetcher: Fetcher = fetch
): Promise<void> {
  const params = new URLSearchParams({
    token,
    token_type_hint: tokenTypeHint
  });
  await fetcher(`${cfg.apiBase}/oauth2/token/revoke`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: basicAuthHeader(cfg.clientId, cfg.clientSecret)
    },
    body: params.toString()
  });
  // 不檢查 res.ok — revoke 失敗 (例如 token 已過期) 不該 throw
}

// 從 nuxt runtimeConfig 拿 OAuth 設定,集中檢查必要欄位
export function getOAuthConfig(): DiscordOAuthConfig {
  const config = useRuntimeConfig();
  const clientId = (config.public.DISCORD_CLIENT_ID as string) || '';
  const clientSecret = (config.DISCORD_CLIENT_SECRET as string) || '';
  const redirectUri = (config.public.DISCORD_REDIRECT_URI as string) || '';
  const apiBase = (config.public.DISCORD_API_BASE as string) || 'https://discord.com/api';

  if (!clientId || !clientSecret || !redirectUri) {
    throw createError({
      statusCode: 500,
      statusMessage: 'discord oauth env not configured (need CLIENT_ID, CLIENT_SECRET, REDIRECT_URI)'
    });
  }
  return { clientId, clientSecret, redirectUri, apiBase };
}
