import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { groupSlug } from '../../shared/utils/groupSlug';

const voices = JSON.parse(readFileSync('public/voices.json', 'utf-8')) as {
  groups: Array<{ group_name: string; group_description: Record<string, string> }>;
};

describe('groupSlug', () => {
  it('converts underscores to hyphens and lowercases', () => {
    expect(groupSlug('yoda_greetings')).toBe('yoda-greetings');
    expect(groupSlug('Shut-Up')).toBe('shut-up');
  });

  it('gives every group in voices.json a unique, URL-safe slug', () => {
    const slugs = voices.groups.map(g => groupSlug(g.group_name));
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of slugs) expect(s).toMatch(/^[a-z0-9-]+$/);
  });
});

describe('OG image font subset', () => {
  // OG 圖的 CJK 字型只收錄站上用到的字 (scripts/build-og-font.py)。
  // 新增 / 修改分類名稱後出現字型沒有的字,OG 圖會變成方塊字,這裡先擋下來。
  it('covers every character used in group names', () => {
    const covered = new Set(readFileSync('scripts/og-font-chars.txt', 'utf-8'));
    const missing = new Set<string>();
    for (const g of voices.groups) {
      for (const text of Object.values(g.group_description)) {
        for (const ch of text) if (!covered.has(ch)) missing.add(ch);
      }
    }
    expect(
      [...missing].join(''),
      '分類名稱出現 OG 字型沒有的字,請重新執行 scripts/build-og-font.py (用法見檔案開頭)'
    ).toBe('');
  });
});
