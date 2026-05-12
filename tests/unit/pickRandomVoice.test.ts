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
    const result = pickRandomVoice(groups, () => 0);
    expect(result?.voice.id).toBe('only');
    expect(result?.group.group_name).toBe('one');
  });

  it('picks deterministically with stubbed rng (low value)', () => {
    // rng=0 → group[0].voice_list[0]
    const result = pickRandomVoice(fixture, () => 0);
    expect(result?.voice.id).toBe('a1');
    expect(result?.group.group_name).toBe('a');
  });

  it('picks deterministically with stubbed rng (high value)', () => {
    // rng=0.99 → floor(0.99 * 2) = 1 → group[1], voice[0] ('b1', since only one voice)
    const result = pickRandomVoice(fixture, () => 0.99);
    expect(result?.voice.id).toBe('b1');
    expect(result?.group.group_name).toBe('b');
  });

  it('returns matching group+voice pair (regression: group must contain returned voice)', () => {
    for (let i = 0; i < 20; i++) {
      const result = pickRandomVoice(fixture);
      expect(result).not.toBeNull();
      // 群組裡必須真的有這個 voice (不能 group=a voice=b1 之類錯配)
      expect(result!.group.voice_list.some(v => v.id === result!.voice.id)).toBe(true);
    }
  });
});
