<template>
  <div class="soundboard-root">
    <!-- 行動裝置:顯示提示而非真正介面 -->
    <div v-if="isMobile" class="d-flex align-center justify-center pa-6" style="min-height: 100vh">
      <v-card variant="outlined" class="rounded-lg pa-6" max-width="480">
        <div class="d-flex align-center ga-3 mb-3">
          <v-icon :icon="mdiMonitor" size="large" color="primary"></v-icon>
          <h2 class="text-h6 font-weight-bold ma-0">{{ $t('soundboard.mobile_hint_title') }}</h2>
        </div>
        <p class="text-body-2 mb-4 text-medium-emphasis">{{ $t('soundboard.mobile_hint_body') }}</p>
        <v-btn :to="localePath('/')" :prepend-icon="mdiHome" color="primary" rounded="lg" class="text-none" block>
          {{ $t('soundboard.back_to_home') }}
        </v-btn>
      </v-card>
    </div>

    <!-- 桌面 soundboard -->
    <div v-else class="d-flex flex-column" style="min-height: 100vh">
      <!-- Top bar:標題 + Overlap toggle + 回主站 -->
      <header class="soundboard-topbar d-flex align-center px-4 py-2 ga-3">
        <h1 class="text-h6 font-weight-bold ma-0">
          <v-icon :icon="mdiVolumeHigh" class="me-2"></v-icon>{{ $t('soundboard.title') }}
        </h1>
        <span class="text-caption text-medium-emphasis d-none d-md-inline">{{ $t('soundboard.subtitle') }}</span>
        <v-spacer></v-spacer>

        <v-btn
          :prepend-icon="mdiLayersTriple"
          :variant="soundboard.overlap ? 'flat' : 'outlined'"
          :color="soundboard.overlap ? 'primary' : ''"
          rounded="lg"
          size="small"
          class="text-none"
          :aria-pressed="soundboard.overlap"
          :title="$t('soundboard.overlap_hint')"
          @click="onToggleOverlap"
        >
          {{ $t('soundboard.overlap') }}
        </v-btn>

        <v-btn
          :prepend-icon="mdiHome"
          :to="localePath('/')"
          variant="outlined"
          rounded="lg"
          size="small"
          class="text-none"
        >
          {{ $t('soundboard.back_to_home') }}
        </v-btn>
      </header>

      <v-divider></v-divider>

      <!-- 9 個快捷鍵 slot (3×3 grid) -->
      <section class="px-4 py-3">
        <div class="d-flex align-center ga-3 mb-2">
          <h2 class="text-subtitle-1 font-weight-bold ma-0">
            <v-icon :icon="mdiKeyboardOutline" size="small" class="me-1"></v-icon>
            {{ $t('soundboard.pinned_section') }}
          </h2>
          <span class="text-caption text-medium-emphasis">{{ $t('soundboard.pinned_hint') }}</span>
          <v-spacer></v-spacer>
          <v-btn
            v-if="soundboard.pinnedCount > 0"
            :prepend-icon="mdiBackspaceOutline"
            variant="text"
            size="small"
            class="text-none text-medium-emphasis"
            @click="soundboard.clearAllSlots"
          >
            {{ $t('soundboard.clear_all') }}
          </v-btn>
        </div>

        <!-- ClientOnly:slot 內容依賴 cookie 持久化的 store,SSR/prerender 時讀不到 cookie
             會跟 client 真值不一致 → Vue 警告 hydration mismatch 且 class 不會更新。
             所以 slot 區塊只在 client render,fallback 期間給 9 個純 empty slot 撐住版面。 -->
        <ClientOnly>
          <div class="soundboard-slots">
            <div
              v-for="(slotId, idx) in soundboard.pinnedSlots"
              :key="idx"
              class="soundboard-slot"
              :class="{ 'soundboard-slot-empty': !slotId, 'soundboard-slot-drag-over': dragOverSlot === idx }"
              @dragover.prevent="dragOverSlot = idx"
              @dragleave="dragOverSlot = -1"
              @drop.prevent="onDropOnSlot(idx, $event)"
              @click="onSlotClick(idx)"
            >
              <span class="soundboard-slot-key">{{ idx + 1 }}</span>
              <span class="soundboard-slot-label">
                {{ slotId ? voiceLabel(slotId) : $t('soundboard.empty_slot') }}
              </span>
              <v-btn
                v-if="slotId"
                :icon="mdiCloseCircle"
                :aria-label="$t('soundboard.clear_slot')"
                variant="text"
                density="comfortable"
                size="x-small"
                class="soundboard-slot-clear"
                @click.stop="soundboard.clearSlot(idx)"
              ></v-btn>
            </div>
          </div>
          <template #fallback>
            <div class="soundboard-slots">
              <div v-for="n in 9" :key="n" class="soundboard-slot soundboard-slot-empty">
                <span class="soundboard-slot-key">{{ n }}</span>
                <span class="soundboard-slot-label">…</span>
              </div>
            </div>
          </template>
        </ClientOnly>
      </section>

      <v-divider></v-divider>

      <!-- 搜尋 + voice grid -->
      <section class="px-4 py-3 flex-grow-1">
        <v-text-field
          v-model="searchInput"
          :placeholder="$t('soundboard.search_placeholder')"
          :prepend-inner-icon="mdiMagnify"
          :clearable="true"
          variant="outlined"
          density="comfortable"
          hide-details
          class="mb-3"
          @update:model-value="v => (searchInput = v ?? '')"
        ></v-text-field>

        <div class="d-flex align-center ga-2 mb-2 text-caption text-medium-emphasis">
          <v-icon :icon="mdiMusicBoxMultipleOutline" size="small"></v-icon>
          <span>{{ $t('soundboard.voice_list_section') }} ({{ filteredVoices.length }})</span>
        </div>

        <div class="soundboard-voice-grid">
          <button
            v-for="item in filteredVoices"
            :key="item.id"
            type="button"
            class="soundboard-voice-btn"
            draggable="true"
            :aria-label="item.description[currentLocale] || item.name"
            @dragstart="onDragStart(item.id, $event)"
            @click="previewItem(item)"
          >
            {{ item.description[currentLocale] || item.description.zh || item.name }}
          </button>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import {
  mdiVolumeHigh,
  mdiHome,
  mdiLayersTriple,
  mdiMagnify,
  mdiKeyboardOutline,
  mdiCloseCircle,
  mdiBackspaceOutline,
  mdiMonitor,
  mdiMusicBoxMultipleOutline
} from '@mdi/js';
import { useSoundboardStore } from '~/stores/soundboard';

// 用獨立 minimal layout (沒 drawer / app-bar / footer)
// ssr: false — 純互動,鍵盤事件 / 拖曳全 client
definePageMeta({
  layout: 'soundboard',
  ssr: false
});

const { data: voice_lists } = await useAsyncData('voices', () => $fetch('/api/voices'), {
  default: () => ({ groups: [] })
});

const { t, locale } = useI18n();
const localePath = useLocalePath();
const audioStore = useAudioStore();
const soundboard = useSoundboardStore();

const currentLocale = computed(() => locale.value);

const searchInput = ref('');
const dragOverSlot = ref(-1);
const isMobile = ref(false);

// flatten 所有 voice 並準備 ID → voice 查表
const allVoices = computed(() => {
  const arr = [];
  for (const g of voice_lists.value.groups) {
    for (const v of g.voice_list) arr.push(v);
  }
  return arr;
});

const voiceById = computed(() => {
  const m = {};
  for (const v of allVoices.value) m[v.id] = v;
  return m;
});

const voiceLabel = id => {
  const v = voiceById.value[id];
  if (!v) return '';
  return v.description?.[currentLocale.value] || v.description?.zh || v.name;
};

// 搜尋 filter (簡單,用名稱/描述包含關鍵字)
const filteredVoices = computed(() => {
  const q = searchInput.value.trim().toLowerCase();
  if (!q) return allVoices.value;
  return allVoices.value.filter(v => {
    if (v.name?.toLowerCase().includes(q)) return true;
    if (v.description) {
      for (const key of Object.keys(v.description)) {
        if (v.description[key]?.toString().toLowerCase().includes(q)) return true;
      }
    }
    return false;
  });
});

// 偵測行動裝置 (rough by viewport width)
const updateMobile = () => {
  isMobile.value = typeof window !== 'undefined' && window.innerWidth < 1024;
};

// ===== Drag & Drop =====
const onDragStart = (voiceId, e) => {
  e.dataTransfer.setData('text/x-voice-id', voiceId);
  e.dataTransfer.effectAllowed = 'copy';
};

const onDropOnSlot = (slotIdx, e) => {
  const voiceId = e.dataTransfer.getData('text/x-voice-id');
  dragOverSlot.value = -1;
  if (voiceId) soundboard.setSlot(slotIdx, voiceId);
};

// 點空 slot 不做事 (預留給未來 click-to-assign,目前 v1 只用拖曳)
const onSlotClick = idx => {
  const id = soundboard.pinnedSlots[idx];
  if (id) playPinned(idx);
};

// ===== Play =====
const previewItem = item => {
  audioStore.play(item, item.description?.[currentLocale.value] || item.name, t('control.full_name'), t('site.title'));
};

const playPinned = slotIdx => {
  const voiceId = soundboard.pinnedSlots[slotIdx];
  if (!voiceId) return;
  const item = voiceById.value[voiceId];
  if (item) previewItem(item);
};

// ===== Keyboard 1-9 =====
const onKeyDown = e => {
  // input focus 中不觸發 (使用者在打字)
  const tag = (e.target instanceof HTMLElement && e.target.tagName) || '';
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const key = e.key;
  if (key >= '1' && key <= '9') {
    const idx = parseInt(key, 10) - 1;
    if (soundboard.pinnedSlots[idx]) {
      playPinned(idx);
      e.preventDefault();
    }
  }
};

// ===== Overlap lifecycle =====
// 進頁時把 audioStore.overlap 設成 soundboard.overlap;
// 離開時還原 audioStore.overlap = false (避免污染其他頁面)
const onToggleOverlap = () => {
  soundboard.toggleOverlap();
  audioStore.overlap = soundboard.overlap;
};

watch(
  () => soundboard.overlap,
  v => {
    audioStore.overlap = v;
  }
);

// 載入後處理:reset 殘留播放狀態 + prune stale slots
onMounted(() => {
  updateMobile();
  window.addEventListener('resize', updateMobile);
  window.addEventListener('keydown', onKeyDown);
  // 啟用 overlap (從 store 讀)
  audioStore.overlap = soundboard.overlap;
});

watch(
  () => voice_lists.value?.groups?.length,
  len => {
    if (!len) return;
    const validIds = new Set();
    voice_lists.value.groups.forEach(g => g.voice_list.forEach(v => validIds.add(v.id)));
    soundboard.pruneStaleSlots(validIds);
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateMobile);
  window.removeEventListener('keydown', onKeyDown);
  // 還原 overlap = false 避免污染其他頁面
  audioStore.overlap = false;
  audioStore.stopAll();
});

useSeoMeta({
  title: () => t('soundboard.title'),
  description: () => t('soundboard.subtitle'),
  robots: 'noindex, nofollow'
});
</script>

<style scoped>
.soundboard-root {
  background-color: #1a181d;
  min-height: 100vh;
}

.soundboard-topbar {
  background-color: rgba(255, 255, 255, 0.04);
}

/* 9 格 3x3 grid */
.soundboard-slots {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
@media (min-width: 1280px) {
  .soundboard-slots {
    grid-template-columns: repeat(9, 1fr);
  }
}

.soundboard-slot {
  position: relative;
  display: flex;
  align-items: center;
  ga: 8px;
  padding: 8px 10px;
  min-height: 56px;
  background-color: #2a2730;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  cursor: pointer;
  transition:
    background-color 0.15s,
    border-color 0.15s;
}
.soundboard-slot:hover {
  background-color: #353140;
  border-color: rgba(255, 255, 255, 0.15);
}
.soundboard-slot-empty {
  background-color: transparent;
  border-style: dashed;
  cursor: default;
  opacity: 0.7;
}
.soundboard-slot-drag-over {
  border-color: rgb(var(--v-theme-primary)) !important;
  background-color: rgba(189, 19, 61, 0.15);
}

.soundboard-slot-key {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background-color: rgba(255, 255, 255, 0.1);
  font-size: 0.75rem;
  font-weight: 700;
  flex-shrink: 0;
  margin-right: 8px;
}
.soundboard-slot-empty .soundboard-slot-key {
  background-color: rgba(255, 255, 255, 0.05);
  opacity: 0.6;
}

.soundboard-slot-label {
  flex-grow: 1;
  font-size: 0.875rem;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: rgba(255, 255, 255, 0.9);
}
.soundboard-slot-empty .soundboard-slot-label {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.4);
  font-style: italic;
}

.soundboard-slot-clear {
  position: absolute;
  top: 4px;
  right: 4px;
  opacity: 0;
  transition: opacity 0.15s;
}
.soundboard-slot:hover .soundboard-slot-clear {
  opacity: 0.7;
}
.soundboard-slot-clear:hover {
  opacity: 1;
}

/* Voice grid:緊湊小按鈕,1 row 多顆 */
.soundboard-voice-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.soundboard-voice-btn {
  padding: 6px 12px;
  background-color: #2a2730;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.875rem;
  cursor: grab;
  transition:
    background-color 0.12s,
    border-color 0.12s;
  max-width: 240px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.soundboard-voice-btn:hover {
  background-color: #3a3640;
  border-color: rgba(255, 255, 255, 0.2);
}
.soundboard-voice-btn:active {
  cursor: grabbing;
  background-color: rgb(var(--v-theme-primary));
  border-color: rgb(var(--v-theme-primary));
  color: white;
}
</style>
