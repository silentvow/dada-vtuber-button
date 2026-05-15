import { defineStore } from 'pinia';

// 灰妲 Soundboard store — 給實況主用的快速播放工具狀態
//
// 設計:
// 1. pinnedSlots:9 個快捷鍵 slot,每格存一個 voiceId 或 null
//    使用者可以拖曳 voice 到任一格,設定鍵盤 1-9 的播放快捷鍵
// 2. overlap:soundboard 的疊播設定,跟 audioStore.overlap 不同步存,
//    進頁時把這個值套到 audioStore.overlap,離開時 audioStore.overlap 還原 false
//    這樣 streamer 的 soundboard 設定不會洩漏到其他頁面 (例如首頁)
// 3. persist:整個 state 都存 cookie,streamer 下次回來不用重新設定

export const SLOT_COUNT = 9;

export const useSoundboardStore = defineStore('soundboard', {
  state: () => ({
    pinnedSlots: Array<string | null>(SLOT_COUNT).fill(null) as (string | null)[],
    overlap: true // 預設 on (streamer 常用法是連點同一條疊播)
  }),

  getters: {
    // 第 N 格 (1-based) 是否有 pinned voice
    isSlotFilled: state => (slotIdx: number) => state.pinnedSlots[slotIdx] != null,
    pinnedCount: state => state.pinnedSlots.filter(v => v != null).length
  },

  actions: {
    // 把 voice pin 到指定 slot (0-based index)
    setSlot(slotIdx: number, voiceId: string) {
      if (slotIdx < 0 || slotIdx >= SLOT_COUNT) return;
      this.pinnedSlots[slotIdx] = voiceId;
    },

    clearSlot(slotIdx: number) {
      if (slotIdx < 0 || slotIdx >= SLOT_COUNT) return;
      this.pinnedSlots[slotIdx] = null;
    },

    clearAllSlots() {
      this.pinnedSlots = Array(SLOT_COUNT).fill(null);
    },

    toggleOverlap() {
      this.overlap = !this.overlap;
    },

    // 載入後清掉 stale voiceId (voices.json 已不存在的)
    pruneStaleSlots(validVoiceIds: Set<string>) {
      this.pinnedSlots = this.pinnedSlots.map(v => (v && validVoiceIds.has(v) ? v : null));
    }
  },

  persist: true
});
