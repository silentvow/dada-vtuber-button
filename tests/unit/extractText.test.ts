import { describe, it, expect } from 'vitest';
import { extractText } from '../../app/utils/extractText';

// 此測試對應 PR7 修的 bug:VoiceBtn aria-label = "[object Object]"
// 原本 vnodes.join('') 會字串化 VNode 物件,造成 a11y 失敗
describe('extractText', () => {
  it('returns empty string for null/undefined', () => {
    expect(extractText(null)).toBe('');
    expect(extractText(undefined)).toBe('');
  });

  it('returns string as-is', () => {
    expect(extractText('hello')).toBe('hello');
    expect(extractText('')).toBe('');
  });

  it('returns numbers as string', () => {
    expect(extractText(42)).toBe('42');
  });

  it('flattens VNode with children: string', () => {
    expect(extractText({ children: 'hello' })).toBe('hello');
  });

  it('recursively flattens nested VNode children', () => {
    expect(extractText({ children: [{ children: 'nested' }] })).toBe('nested');
  });

  it('joins array of VNodes (the actual VoiceBtn slot case)', () => {
    const vnodes = [{ children: '天老爺阿' }];
    expect(extractText(vnodes)).toBe('天老爺阿');
  });

  it('handles mixed array of strings + VNodes', () => {
    const vnodes = ['prefix-', { children: 'body' }, '-suffix'];
    expect(extractText(vnodes)).toBe('prefix-body-suffix');
  });

  it('NEVER returns "[object Object]" (regression test for PR7 bug)', () => {
    const vnode = { type: 'span', children: '能有多糟呢', someOtherProp: 'foo' };
    const result = extractText(vnode);
    expect(result).not.toBe('[object Object]');
    expect(result).toBe('能有多糟呢');
  });
});
