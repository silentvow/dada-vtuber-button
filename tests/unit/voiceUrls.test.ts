import { describe, it, expect } from 'vitest';
import { getVoiceUrls, getPrimaryVoiceUrl } from '../../app/utils/voiceUrls';

describe('getVoiceUrls', () => {
  it('returns single local URL in dev mode', () => {
    const urls = getVoiceUrls('foo/bar.mp3', { isProd: false });
    expect(urls).toEqual(['/voices/foo/bar.mp3']);
  });

  it('returns two CDN URLs in prod mode (jsdelivr + statically)', () => {
    const urls = getVoiceUrls('foo/bar.mp3', { isProd: true });
    expect(urls).toHaveLength(2);
    expect(urls[0]).toMatch(/^https:\/\/cdn\.jsdelivr\.net\/.+\/foo\/bar\.mp3$/);
    expect(urls[1]).toMatch(/^https:\/\/cdn\.statically\.io\/.+\/foo\/bar\.mp3$/);
  });

  it('jsdelivr URL is listed first (primary)', () => {
    const urls = getVoiceUrls('x.mp3', { isProd: true });
    expect(urls[0]).toContain('jsdelivr');
    expect(urls[1]).toContain('statically');
  });

  it('builds correct path for nested folders', () => {
    const urls = getVoiceUrls('talk-vtuber/taiwan-ba-ma.mp3', { isProd: true });
    urls.forEach(u => expect(u).toContain('talk-vtuber/taiwan-ba-ma.mp3'));
  });
});

describe('getPrimaryVoiceUrl', () => {
  it('returns first URL of getVoiceUrls (jsdelivr in prod)', () => {
    const url = getPrimaryVoiceUrl('foo.mp3', { isProd: true });
    expect(url).toContain('jsdelivr');
    expect(url).toContain('foo.mp3');
  });

  it('returns dev URL in dev mode', () => {
    expect(getPrimaryVoiceUrl('foo.mp3', { isProd: false })).toBe('/voices/foo.mp3');
  });
});
