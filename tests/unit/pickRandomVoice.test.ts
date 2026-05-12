import { describe, it, expect } from 'vitest';
import { pickRandomVoice } from '../../app/utils/pickRandomVoice';

const fixture = [
  {
    group_name: 'a',
    voice_list: [
      { id: 'a1', name: 'a1' },
      { id: 'a2', name: 'a2' }
    ]
  },
  {
    group_name: 'b',
    voice_list: [{ id: 'b1', name: 'b1' }]
  }
];

describe('pickRandomVoice', () => {
  it('returns null for empty / nullish input', () => {
    expect(pickRandomVoice(undefined)).toBeNull();
    expect(pickRandomVoice(null)).toBeNull();
    expect(pickRandomVoice([])).toBeNull();
  });

  it('returns null if all groups are empty', () => {
    expect(pickRandomVoice([{ group_name: 'x', voice_list: [] }])).toBeNull();
  });

  it('skips empty groups', () => {
    const groups = [
      { group_name: 'empty', voice_list: [] },
      { group_name: 'one', voice_list: [{ id: 'only', name: 'only' }] }
    ];
    // rng returns 0 → picks first non-empty group (idx 0 of filtered list = 'one')
    const result = pickRandomVoice(groups, () => 0);
    expect(result?.id).toBe('only');
  });

  it('picks deterministically with stubbed rng (low value)', () => {
    // rng=0 → group[0].voice_list[0]
    expect(pickRandomVoice(fixture, () => 0)?.id).toBe('a1');
  });

  it('picks deterministically with stubbed rng (high value)', () => {
    // rng=0.99 → floor(0.99 * 2) = 1 → group[1], voice[0] ('b1', since only one voice)
    expect(pickRandomVoice(fixture, () => 0.99)?.id).toBe('b1');
  });

  it('returns a valid voice from the pool', () => {
    // 跑 10 次,結果都應該在 pool 內
    const validIds = new Set(['a1', 'a2', 'b1']);
    for (let i = 0; i < 10; i++) {
      const result = pickRandomVoice(fixture);
      expect(validIds.has(result?.id || '')).toBe(true);
    }
  });
});
