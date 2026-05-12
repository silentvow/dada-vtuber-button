import { describe, it, expect } from 'vitest';
import { filterVoiceGroups } from '../../app/utils/filterVoiceGroups';

const fixture = [
  {
    id: 'catchphrase',
    group_name: 'catchphrase',
    group_description: { zh: '口頭禪', ja: '口癖', en: 'Catchphrase' },
    voice_list: [
      {
        id: 'v1',
        name: 'tian-lao-ye-a',
        description: { zh: '天老爺阿', ja: 'ああ神様', en: 'Oh dear Lord' },
        year: '2024'
      },
      {
        id: 'v2',
        name: 'how-bad',
        description: { zh: '能有多糟呢', ja: 'どれだけ悪く', en: 'How bad could it be' },
        year: '2023'
      }
    ]
  },
  {
    id: 'singing',
    group_name: 'singing',
    group_description: { zh: '歌唱', ja: '歌唱', en: 'Singing' },
    voice_list: [
      {
        id: 'v3',
        name: 'la-la-la',
        description: { zh: '啦啦啦', ja: 'ラララ', en: 'la la la' },
        year: '2024'
      }
    ]
  }
];

describe('filterVoiceGroups', () => {
  it('no filter returns everything', () => {
    const out = filterVoiceGroups(fixture);
    expect(out).toHaveLength(2);
    expect(out[0].voice_list).toHaveLength(2);
  });

  it('year filter scopes voices and hides empty groups', () => {
    const out = filterVoiceGroups(fixture, { year: '2023' });
    expect(out).toHaveLength(1);
    expect(out[0].voice_list).toHaveLength(1);
    expect(out[0].voice_list[0].id).toBe('v2');
  });

  it('query matches Chinese description', () => {
    const out = filterVoiceGroups(fixture, { query: '天老爺' });
    expect(out).toHaveLength(1);
    expect(out[0].voice_list).toHaveLength(1);
    expect(out[0].voice_list[0].id).toBe('v1');
  });

  it('query matches Japanese description', () => {
    const out = filterVoiceGroups(fixture, { query: '神様' });
    expect(out).toHaveLength(1);
    expect(out[0].voice_list[0].id).toBe('v1');
  });

  it('query matches English description (case insensitive)', () => {
    const out = filterVoiceGroups(fixture, { query: 'how bad' });
    expect(out).toHaveLength(1);
    expect(out[0].voice_list[0].id).toBe('v2');
  });

  it('query matches voice name', () => {
    const out = filterVoiceGroups(fixture, { query: 'tian-lao' });
    expect(out).toHaveLength(1);
    expect(out[0].voice_list[0].id).toBe('v1');
  });

  it('group name match returns all (year-matching) voices in that group', () => {
    const out = filterVoiceGroups(fixture, { query: 'Catchphrase' });
    expect(out).toHaveLength(1);
    expect(out[0].voice_list).toHaveLength(2); // 整組都保留
  });

  it('query + year combine (AND)', () => {
    const out = filterVoiceGroups(fixture, { query: 'Oh dear', year: '2023' });
    // v1 matches query but year=2024,不符合 2023 → 結果為空
    expect(out).toHaveLength(0);
  });

  it('no match returns empty array', () => {
    const out = filterVoiceGroups(fixture, { query: 'NONEXISTENT' });
    expect(out).toHaveLength(0);
  });

  it('empty query is treated as no query (returns all)', () => {
    expect(filterVoiceGroups(fixture, { query: '' })).toHaveLength(2);
    expect(filterVoiceGroups(fixture, { query: '   ' })).toHaveLength(2);
  });

  it('case insensitive across all locales', () => {
    expect(filterVoiceGroups(fixture, { query: 'OH DEAR LORD' })).toHaveLength(1);
    expect(filterVoiceGroups(fixture, { query: 'oh dear lord' })).toHaveLength(1);
  });
});
