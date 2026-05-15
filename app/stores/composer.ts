import { defineStore } from 'pinia';
import { useAudioStore } from './audio';

// 語音編曲 store — 使用者挑選 + 排序語音,組成序列一鍵播放
//
// 設計重點:
// 1. 允許同一 voice 多次加入 (每個 item 有獨立 instanceId,不是用 voiceId 當 key)
// 2. localStorage 持久化 items 跟 loop;不持久化 isPlaying / currentIndex (refresh 應重置)
// 3. 播放中鎖編輯 (UI 層用 isPlaying 控制 add/remove/reorder/clear 的 disabled)
// 4. 上限 50,UI 從頭顯示 (count / max),達上限 add 按鈕變 disabled
// 5. 載入時清掉 stale items (voices.json 已移除的 voiceId),避免播放時 audioStore 拿不到檔
// 6. 播放錯誤(全 CDN race fail)→ 自動跳過下一條,而非整串停掉

export const MAX_ITEMS = 50;

export interface ComposerItem {
  instanceId: string; // crypto.randomUUID()
  voiceId: string; // 對應 voices.json 的 id
  path: string; // 語音檔路徑 (snapshot)
  description: Record<string, string>; // i18n 描述 snapshot
  name: string;
}

interface Voice {
  id: string;
  name: string;
  path: string;
  description: Record<string, string>;
}

export const useComposerStore = defineStore('composer', {
  state: () => ({
    items: [] as ComposerItem[],
    isPlaying: false,
    currentIndex: -1, // -1 = 不在播放
    loop: false
  }),

  getters: {
    count: state => state.items.length,
    isFull: state => state.items.length >= MAX_ITEMS,
    isEmpty: state => state.items.length === 0
  },

  actions: {
    // 加入一條 voice 到尾端;達上限時不加 (UI 應已 disable 但保險)
    add(voice: Voice) {
      if (this.items.length >= MAX_ITEMS) return false;
      this.items.push({
        instanceId: crypto.randomUUID(),
        voiceId: voice.id,
        path: voice.path,
        description: voice.description || {},
        name: voice.name
      });
      return true;
    },

    // 用 instanceId 移除 (不是 voiceId,因允許重複)
    remove(instanceId: string) {
      this.items = this.items.filter(it => it.instanceId !== instanceId);
    },

    // 拖曳完成後整個 items 換掉 (vuedraggable v-model 直接改 array)
    reorder(newItems: ComposerItem[]) {
      this.items = newItems;
    },

    clear() {
      this.items = [];
    },

    toggleLoop() {
      this.loop = !this.loop;
    },

    // 載入後清掉 stale items:跟當前 voices.json 對比,不存在的就移除
    pruneStaleItems(validVoiceIds: Set<string>) {
      this.items = this.items.filter(it => validVoiceIds.has(it.voiceId));
    },

    // === 順序播放 ===
    playAll() {
      if (this.items.length === 0) return;
      this.isPlaying = true;
      this.currentIndex = 0;
      this._playCurrent();
    },

    stopAll() {
      const audioStore = useAudioStore();
      audioStore.stopAll();
      this.isPlaying = false;
      this.currentIndex = -1;
    },

    _playCurrent() {
      if (!this.isPlaying) return; // 已被 stopAll
      const item = this.items[this.currentIndex];
      if (!item) {
        this._handleQueueEnd();
        return;
      }
      const audioStore = useAudioStore();
      audioStore.play(item, item.description.zh || item.name, item.name, '灰妲語音編曲', undefined, {
        onEnd: () => this._handleNext(),
        // 錯誤就跳過下一條,而非整串停掉 (使用者選的決定)
        onError: () => this._handleNext()
      });
    },

    _handleNext() {
      if (!this.isPlaying) return; // 中途被 stopAll
      this.currentIndex++;
      if (this.currentIndex >= this.items.length) {
        if (this.loop) {
          this.currentIndex = 0;
          this._playCurrent();
        } else {
          this._handleQueueEnd();
        }
      } else {
        this._playCurrent();
      }
    },

    _handleQueueEnd() {
      this.isPlaying = false;
      this.currentIndex = -1;
    }
  },

  // 持久化整個 state — refresh 時 isPlaying/currentIndex 會在 onMounted 時 reset
  // (試過 persist: { paths: [...] } 但這版 plugin 沒生效,改用 persist: true)
  persist: true
});
