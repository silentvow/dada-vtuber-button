import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useSoundboardStore, SLOT_COUNT } from '../../app/stores/soundboard';

beforeEach(() => {
  setActivePinia(createPinia());
});

describe('soundboard store', () => {
  describe('initial state', () => {
    it('has 9 empty slots', () => {
      const s = useSoundboardStore();
      expect(s.pinnedSlots).toHaveLength(SLOT_COUNT);
      expect(s.pinnedSlots.every(v => v === null)).toBe(true);
      expect(s.pinnedCount).toBe(0);
    });

    it('overlap defaults to true (streamer-friendly)', () => {
      const s = useSoundboardStore();
      expect(s.overlap).toBe(true);
    });
  });

  describe('setSlot', () => {
    it('assigns voiceId to specified slot', () => {
      const s = useSoundboardStore();
      s.setSlot(0, 'v1');
      expect(s.pinnedSlots[0]).toBe('v1');
      expect(s.pinnedCount).toBe(1);
      expect(s.isSlotFilled(0)).toBe(true);
      expect(s.isSlotFilled(1)).toBe(false);
    });

    it('overwrites existing slot', () => {
      const s = useSoundboardStore();
      s.setSlot(2, 'old');
      s.setSlot(2, 'new');
      expect(s.pinnedSlots[2]).toBe('new');
      expect(s.pinnedCount).toBe(1);
    });

    it('ignores out-of-range index', () => {
      const s = useSoundboardStore();
      s.setSlot(-1, 'v1');
      s.setSlot(99, 'v2');
      expect(s.pinnedCount).toBe(0);
    });

    it('allows same voiceId in multiple slots', () => {
      const s = useSoundboardStore();
      s.setSlot(0, 'samevoice');
      s.setSlot(3, 'samevoice');
      expect(s.pinnedSlots[0]).toBe('samevoice');
      expect(s.pinnedSlots[3]).toBe('samevoice');
      expect(s.pinnedCount).toBe(2);
    });
  });

  describe('clearSlot', () => {
    it('removes voiceId from slot', () => {
      const s = useSoundboardStore();
      s.setSlot(4, 'v1');
      s.clearSlot(4);
      expect(s.pinnedSlots[4]).toBeNull();
      expect(s.pinnedCount).toBe(0);
    });

    it('ignores out-of-range', () => {
      const s = useSoundboardStore();
      s.setSlot(0, 'v1');
      s.clearSlot(-1);
      s.clearSlot(99);
      expect(s.pinnedSlots[0]).toBe('v1');
    });
  });

  describe('clearAllSlots', () => {
    it('resets all to null', () => {
      const s = useSoundboardStore();
      s.setSlot(0, 'a');
      s.setSlot(5, 'b');
      s.setSlot(8, 'c');
      s.clearAllSlots();
      expect(s.pinnedSlots.every(v => v === null)).toBe(true);
      expect(s.pinnedCount).toBe(0);
    });

    it('keeps slot count at 9 after clear', () => {
      const s = useSoundboardStore();
      s.setSlot(0, 'a');
      s.clearAllSlots();
      expect(s.pinnedSlots).toHaveLength(SLOT_COUNT);
    });
  });

  describe('toggleOverlap', () => {
    it('toggles the overlap flag', () => {
      const s = useSoundboardStore();
      expect(s.overlap).toBe(true);
      s.toggleOverlap();
      expect(s.overlap).toBe(false);
      s.toggleOverlap();
      expect(s.overlap).toBe(true);
    });
  });

  describe('pruneStaleSlots', () => {
    it('clears slots whose voiceId is not in valid set', () => {
      const s = useSoundboardStore();
      s.setSlot(0, 'alive');
      s.setSlot(2, 'dead');
      s.setSlot(5, 'alive');
      s.pruneStaleSlots(new Set(['alive']));
      expect(s.pinnedSlots[0]).toBe('alive');
      expect(s.pinnedSlots[2]).toBeNull();
      expect(s.pinnedSlots[5]).toBe('alive');
      expect(s.pinnedCount).toBe(2);
    });
  });
});
