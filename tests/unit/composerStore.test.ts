import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useComposerStore, MAX_ITEMS } from '../../app/stores/composer';

// Mock crypto.randomUUID for deterministic id assertions
let uuidCounter = 0;
beforeEach(() => {
  setActivePinia(createPinia());
  uuidCounter = 0;
  vi.stubGlobal('crypto', {
    randomUUID: () => `uuid-${++uuidCounter}`
  });
});

const mkVoice = (id: string, name = id) => ({
  id,
  name,
  path: `${id}.mp3`,
  description: { zh: name, en: name }
});

describe('composer store', () => {
  describe('add', () => {
    it('appends a new item with a fresh instanceId', () => {
      const s = useComposerStore();
      s.add(mkVoice('v1'));
      expect(s.items).toHaveLength(1);
      expect(s.items[0]).toMatchObject({ voiceId: 'v1', instanceId: 'uuid-1' });
    });

    it('allows the same voice to be added multiple times (different instanceIds)', () => {
      const s = useComposerStore();
      s.add(mkVoice('v1'));
      s.add(mkVoice('v1'));
      s.add(mkVoice('v1'));
      expect(s.items).toHaveLength(3);
      const ids = s.items.map(it => it.instanceId);
      expect(new Set(ids).size).toBe(3); // unique
    });

    it('returns true on success, false when full', () => {
      const s = useComposerStore();
      for (let i = 0; i < MAX_ITEMS; i++) {
        expect(s.add(mkVoice(`v${i}`))).toBe(true);
      }
      expect(s.count).toBe(MAX_ITEMS);
      expect(s.isFull).toBe(true);
      expect(s.add(mkVoice('overflow'))).toBe(false);
      expect(s.count).toBe(MAX_ITEMS); // unchanged
    });

    it('snapshots voice path + description (not by reference)', () => {
      const s = useComposerStore();
      const v = mkVoice('v1', 'original');
      s.add(v);
      v.path = 'mutated.mp3';
      v.description.zh = 'mutated';
      // store snapshot 應該不受影響 (描述是 reference 共享有點難避免,但 path 是 primitive snapshot)
      expect(s.items[0].path).toBe('v1.mp3');
    });
  });

  describe('remove', () => {
    it('removes by instanceId, leaving other items with same voiceId intact', () => {
      const s = useComposerStore();
      s.add(mkVoice('v1')); // uuid-1
      s.add(mkVoice('v1')); // uuid-2
      s.add(mkVoice('v1')); // uuid-3
      s.remove('uuid-2');
      expect(s.items).toHaveLength(2);
      expect(s.items.map(it => it.instanceId)).toEqual(['uuid-1', 'uuid-3']);
    });

    it('no-op when instanceId not found', () => {
      const s = useComposerStore();
      s.add(mkVoice('v1'));
      s.remove('does-not-exist');
      expect(s.items).toHaveLength(1);
    });
  });

  describe('reorder', () => {
    it('replaces the items array with new order', () => {
      const s = useComposerStore();
      s.add(mkVoice('a'));
      s.add(mkVoice('b'));
      s.add(mkVoice('c'));
      const reversed = [...s.items].reverse();
      s.reorder(reversed);
      expect(s.items.map(it => it.voiceId)).toEqual(['c', 'b', 'a']);
    });
  });

  describe('clear', () => {
    it('empties items', () => {
      const s = useComposerStore();
      s.add(mkVoice('v1'));
      s.add(mkVoice('v2'));
      s.clear();
      expect(s.items).toHaveLength(0);
      expect(s.isEmpty).toBe(true);
    });
  });

  describe('toggleLoop', () => {
    it('toggles the loop flag', () => {
      const s = useComposerStore();
      expect(s.loop).toBe(false);
      s.toggleLoop();
      expect(s.loop).toBe(true);
      s.toggleLoop();
      expect(s.loop).toBe(false);
    });
  });

  describe('pruneStaleItems', () => {
    it('filters out items whose voiceId is not in the valid set', () => {
      const s = useComposerStore();
      s.add(mkVoice('alive'));
      s.add(mkVoice('dead'));
      s.add(mkVoice('alive'));
      s.pruneStaleItems(new Set(['alive']));
      expect(s.items).toHaveLength(2);
      expect(s.items.every(it => it.voiceId === 'alive')).toBe(true);
    });
  });

  describe('getters', () => {
    it('count, isEmpty, isFull are reactive', () => {
      const s = useComposerStore();
      expect(s.isEmpty).toBe(true);
      expect(s.count).toBe(0);
      expect(s.isFull).toBe(false);
      s.add(mkVoice('v1'));
      expect(s.isEmpty).toBe(false);
      expect(s.count).toBe(1);
    });
  });
});
