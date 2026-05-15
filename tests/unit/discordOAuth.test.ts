import { describe, it, expect, vi } from 'vitest';
import { exchangeCodeForTokens, refreshAccessToken, revokeToken } from '../../server/utils/discord';

const cfg = {
  clientId: 'test-client-id',
  clientSecret: 'test-client-secret',
  redirectUri: 'https://example.com/member',
  apiBase: 'https://discord.com/api'
};

// 假裝是 fetch 的 mock,看每次 call 帶的 url + headers + body
function mockFetch(responseBody: any, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => responseBody,
    text: async () => JSON.stringify(responseBody)
  } as any);
}

describe('discord oauth helpers', () => {
  describe('exchangeCodeForTokens', () => {
    it('POSTs to token endpoint with grant_type=authorization_code + code + redirect_uri', async () => {
      const fakeFetch = mockFetch({
        access_token: 'A',
        refresh_token: 'R',
        expires_in: 604800,
        token_type: 'Bearer',
        scope: 'identify'
      });

      const result = await exchangeCodeForTokens(cfg, 'the-code', fakeFetch as any);

      expect(fakeFetch).toHaveBeenCalledTimes(1);
      const [url, init] = fakeFetch.mock.calls[0];
      expect(url).toBe('https://discord.com/api/oauth2/token');
      expect(init.method).toBe('POST');
      expect(init.headers['Content-Type']).toBe('application/x-www-form-urlencoded');
      // Basic auth header: base64("client_id:client_secret")
      expect(init.headers.Authorization).toMatch(/^Basic /);
      const decoded = Buffer.from(init.headers.Authorization.replace('Basic ', ''), 'base64').toString();
      expect(decoded).toBe('test-client-id:test-client-secret');
      // body 必須是 form-encoded 含這些欄位
      expect(init.body).toContain('grant_type=authorization_code');
      expect(init.body).toContain('code=the-code');
      expect(init.body).toContain('redirect_uri=https%3A%2F%2Fexample.com%2Fmember');

      expect(result.access_token).toBe('A');
      expect(result.refresh_token).toBe('R');
      expect(result.expires_in).toBe(604800);
      expect(result.expires_at).toBeGreaterThan(Date.now());
      // expires_at 應該約等於 now + 604800*1000 (誤差 < 1 秒)
      expect(Math.abs(result.expires_at - (Date.now() + 604800 * 1000))).toBeLessThan(1000);
    });

    it('throws on non-2xx Discord response', async () => {
      const fakeFetch = mockFetch({ error: 'invalid_grant' }, 400);
      await expect(exchangeCodeForTokens(cfg, 'bad-code', fakeFetch as any)).rejects.toThrow(/discord oauth error 400/);
    });
  });

  describe('refreshAccessToken', () => {
    it('POSTs with grant_type=refresh_token + refresh_token', async () => {
      const fakeFetch = mockFetch({
        access_token: 'NEW_A',
        refresh_token: 'NEW_R',
        expires_in: 604800,
        token_type: 'Bearer',
        scope: 'identify'
      });

      const result = await refreshAccessToken(cfg, 'old-refresh-token', fakeFetch as any);

      expect(fakeFetch).toHaveBeenCalledTimes(1);
      const init = fakeFetch.mock.calls[0][1];
      expect(init.body).toContain('grant_type=refresh_token');
      expect(init.body).toContain('refresh_token=old-refresh-token');

      // refresh 應該回傳新的 access + refresh (Discord 每次 refresh 都會 rotate refresh_token)
      expect(result.access_token).toBe('NEW_A');
      expect(result.refresh_token).toBe('NEW_R');
      expect(result.expires_at).toBeGreaterThan(Date.now());
    });

    it('throws on non-2xx (refresh_token revoked / expired)', async () => {
      const fakeFetch = mockFetch({ error: 'invalid_grant' }, 401);
      await expect(refreshAccessToken(cfg, 'revoked', fakeFetch as any)).rejects.toThrow(/discord oauth error 401/);
    });
  });

  describe('revokeToken', () => {
    it('POSTs to revoke endpoint with token + token_type_hint', async () => {
      const fakeFetch = mockFetch({});
      await revokeToken(cfg, 'some-token', 'access_token', fakeFetch as any);

      expect(fakeFetch).toHaveBeenCalledTimes(1);
      const [url, init] = fakeFetch.mock.calls[0];
      expect(url).toBe('https://discord.com/api/oauth2/token/revoke');
      expect(init.body).toContain('token=some-token');
      expect(init.body).toContain('token_type_hint=access_token');
    });

    it('does NOT throw when Discord returns error (revoke failures are expected and benign)', async () => {
      const fakeFetch = mockFetch({ error: 'invalid_token' }, 400);
      // 即使 Discord 回 400,revoke 也不該 throw — logout 流程不該被擋
      await expect(revokeToken(cfg, 'bad', 'access_token', fakeFetch as any)).resolves.toBeUndefined();
    });
  });
});
