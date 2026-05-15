<template>
  <v-container class="d-flex flex-column align-center px-0 pt-0" fluid>
    <v-col cols="12" class="pa-0" style="min-width: 85%">
      <!-- Header:標題 + 描述 (計數移到編輯區 toolbar 內) -->
      <div class="mb-3">
        <h1 class="text-h4 font-weight-bold" :class="dark_text">{{ $t('compose.title') }}</h1>
        <p class="text-body-2 mt-1 mb-0 text-medium-emphasis">{{ $t('compose.description') }}</p>
      </div>

      <!-- ============== 編輯區 ============== -->
      <v-card variant="flat" class="mb-6 rounded-lg composer-card">
        <!-- Control bar:flex 直接寫 (不用 v-toolbar) 因為 v-toolbar 內部的 flex
             覆蓋外層 gap-2,跟首頁 layout/menu 一樣手動排比較好控制。
             所有按鈕統一 outlined variant;disabled state 視覺差大,不會被誤判成「能按沒反應」。 -->
        <div class="d-flex align-center flex-wrap composer-toolbar px-4 py-3">
          <!-- 主動作:一鍵播放 / 停止 -->
          <v-btn
            v-if="!composer.isPlaying"
            :prepend-icon="mdiPlayCircleOutline"
            :disabled="composer.isEmpty"
            color="primary"
            variant="outlined"
            rounded="lg"
            class="text-none me-2"
            @click="onPlayAll"
          >
            {{ $t('compose.play_all') }}
          </v-btn>
          <v-btn
            v-else
            :prepend-icon="mdiStopCircleOutline"
            color="primary"
            variant="outlined"
            rounded="lg"
            class="text-none me-2"
            @click="onStop"
          >
            {{ $t('compose.stop') }}
          </v-btn>

          <!-- Loop toggle:不改 variant,改用 color 表示 on/off (primary 紅 = on,空色 = off) -->
          <v-btn
            :prepend-icon="mdiRepeat"
            variant="outlined"
            :color="composer.loop ? 'primary' : ''"
            rounded="lg"
            class="text-none me-2"
            :aria-pressed="composer.loop"
            @click="composer.toggleLoop"
          >
            {{ composer.loop ? $t('compose.loop_on') : $t('compose.loop') }}
          </v-btn>

          <v-spacer></v-spacer>

          <!-- 計數:用 v-chip variant=text (純文字,沒填充沒邊框),達上限變紅提醒 -->
          <v-chip
            :color="composer.isFull ? 'error' : ''"
            variant="text"
            size="default"
            class="font-weight-bold flex-grow-0 me-2"
            :aria-label="$t('compose.count', { count: composer.count, max: MAX_ITEMS })"
          >
            {{ $t('compose.count', { count: composer.count, max: MAX_ITEMS }) }}
          </v-chip>

          <!-- 重置:也 outlined,但顏色用 error 提示破壞性 -->
          <v-btn
            :prepend-icon="mdiTrashCanOutline"
            :disabled="composer.isEmpty || composer.isPlaying"
            color="error"
            variant="outlined"
            rounded="lg"
            class="text-none"
            @click="showResetConfirm = true"
          >
            {{ $t('compose.reset') }}
          </v-btn>
        </div>

        <v-divider opacity="0.12"></v-divider>

        <!-- 編輯區內容:空 / draggable list -->
        <v-card-text class="pa-3 composer-list-area" style="min-height: 120px">
          <div
            v-if="composer.isEmpty"
            class="d-flex flex-column align-center justify-center text-medium-emphasis py-8"
            style="text-align: center"
          >
            <v-icon :icon="mdiMusicBoxMultipleOutline" size="48" class="mb-2 opacity-50"></v-icon>
            <p class="text-body-1">{{ $t('compose.empty_hint') }}</p>
          </div>

          <v-alert
            v-else-if="composer.isPlaying"
            type="info"
            variant="tonal"
            density="compact"
            class="mb-3"
            :icon="mdiInformationOutline"
          >
            {{ $t('compose.editing_locked_during_play') }}
          </v-alert>

          <!-- 拖曳教學:有 2 條以上 + 非播放中時顯示,輕量字級避免擋住主內容 -->
          <p
            v-if="composer.items.length >= 2 && !composer.isPlaying"
            class="text-caption text-medium-emphasis mb-2 px-2 d-flex align-center gap-1"
          >
            <v-icon :icon="mdiGestureTap" size="x-small"></v-icon>
            {{ $t('compose.drag_tip') }}
          </p>

          <draggable
            v-if="!composer.isEmpty"
            :model-value="composer.items"
            item-key="instanceId"
            handle=".drag-handle"
            :animation="200"
            :force-fallback="true"
            :disabled="composer.isPlaying"
            ghost-class="composer-item-ghost"
            tag="ul"
            class="composer-list pa-0 ma-0"
            @update:model-value="newItems => composer.reorder(newItems)"
          >
            <template #item="{ element, index }">
              <li
                class="composer-item d-flex align-center gap-2 px-2 py-2 mb-2 rounded"
                :class="{ 'composer-item-playing': composer.currentIndex === index }"
              >
                <!-- Drag handle (subtle but cursor 指示可拖) -->
                <v-btn
                  :icon="mdiDragVertical"
                  :aria-label="$t('compose.drag_handle')"
                  variant="text"
                  density="comfortable"
                  size="small"
                  class="drag-handle flex-grow-0"
                  :disabled="composer.isPlaying"
                ></v-btn>

                <!-- 編號 (圓形 badge 風格) -->
                <span class="composer-item-index" :aria-label="$t('compose.item_position', { pos: index + 1 })">
                  {{ index + 1 }}
                </span>

                <!-- 名稱 + 群組標 -->
                <div class="flex-grow-1 d-flex flex-column" style="min-width: 0">
                  <span class="text-caption text-medium-emphasis composer-item-group">
                    {{ groupNameOf(element.voiceId) }}
                  </span>
                  <span class="text-body-1 composer-item-name" :class="dark_text">
                    {{ element.description[current_locale] || element.description.zh || element.name }}
                  </span>
                </div>

                <!-- 播放中的視覺指示 (文字 + 動畫,不只靠顏色 — a11y) -->
                <span
                  v-if="composer.currentIndex === index"
                  class="d-flex align-center gap-1 text-caption text-primary font-weight-bold flex-grow-0 mr-2"
                  aria-live="polite"
                >
                  <v-icon :icon="mdiVolumeHigh" size="small" class="composer-playing-pulse"></v-icon>
                  {{ $t('compose.now_playing_item') }}
                </span>

                <!-- 試聽 (icon-only secondary action) -->
                <v-btn
                  :icon="mdiPlayOutline"
                  :aria-label="$t('compose.preview') + '：' + (element.description[current_locale] || element.name)"
                  variant="text"
                  density="comfortable"
                  size="small"
                  class="flex-grow-0"
                  :disabled="composer.isPlaying"
                  @click="previewItem(element)"
                ></v-btn>

                <!-- 移除 (icon-only,hover 才變紅) -->
                <v-btn
                  :icon="mdiCloseCircleOutline"
                  :aria-label="$t('compose.remove_item') + '：' + (element.description[current_locale] || element.name)"
                  variant="text"
                  density="comfortable"
                  size="small"
                  class="flex-grow-0 composer-item-remove"
                  :disabled="composer.isPlaying"
                  @click="composer.remove(element.instanceId)"
                ></v-btn>
              </li>
            </template>
          </draggable>
        </v-card-text>
      </v-card>

      <!-- ============== 區隔 + 語音列表標題 ============== -->
      <div class="d-flex align-center gap-3 mb-2 mt-8 compose-divider">
        <v-divider class="flex-grow-1" opacity="0.3"></v-divider>
        <span class="text-body-2 text-medium-emphasis font-weight-medium compose-divider-label">
          {{ $t('compose.pick_from_below') }}
        </span>
        <v-divider class="flex-grow-1" opacity="0.3"></v-divider>
      </div>

      <!-- 語音列表:VoiceBtn 開 addMode — 左側跟首頁一樣的 voice button (點擊試聽),
           右側不是 ≡ 選單,而是 + 按鈕 (點擊加入編輯區,不彈選單)。 -->
      <VoiceListWithSearch :groups="voice_lists.groups">
        <template #voice="{ group }">
          <VoiceBtn
            v-for="item in group.voice_list"
            :key="item.id"
            :voice-id="item.id"
            :from-youtube="false"
            :add-mode="true"
            :disabled="composer.isFull || composer.isPlaying"
            @on-play="previewItem(item)"
            @on-add="onAddVoice(item)"
          >
            {{ item.description[current_locale] || item.description.zh || item.name }}
          </VoiceBtn>
        </template>
      </VoiceListWithSearch>
    </v-col>

    <!-- Reset 確認 dialog (一律 confirm) -->
    <v-dialog v-model="showResetConfirm" max-width="480px">
      <v-card class="rounded-lg">
        <v-card-title class="text-h6 font-weight-bold pt-4">
          {{ $t('compose.reset_confirm_title') }}
        </v-card-title>
        <v-card-text class="pb-2">
          {{ $t('compose.reset_confirm_message', { count: composer.count }) }}
        </v-card-text>
        <v-card-actions class="px-4 pb-4">
          <v-spacer></v-spacer>
          <v-btn rounded="lg" variant="text" class="text-none" @click="showResetConfirm = false">
            {{ $t('compose.reset_confirm_no') }}
          </v-btn>
          <v-btn
            :prepend-icon="mdiTrashCanOutline"
            color="error"
            rounded="lg"
            class="text-none"
            @click="onResetConfirm"
          >
            {{ $t('compose.reset_confirm_yes') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 加入語音的 snackbar (短訊息) -->
    <v-snackbar v-model="showAddSnackbar" :timeout="1500" location="bottom" color="success">
      {{ addSnackbarText }}
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import draggable from 'vuedraggable';
import {
  mdiPlayCircleOutline,
  mdiStopCircleOutline,
  mdiRepeat,
  mdiTrashCanOutline,
  mdiDragVertical,
  mdiPlayOutline,
  mdiCloseCircleOutline,
  mdiMusicBoxMultipleOutline,
  mdiInformationOutline,
  mdiVolumeHigh,
  mdiGestureTap
} from '@mdi/js';
import { useComposerStore, MAX_ITEMS } from '~/stores/composer';

// 純互動頁,不參與 SSG 預渲染 (狀態本來就在 client cookies/localStorage)
definePageMeta({
  ssr: false
});

// voices.json 維持跟首頁同樣的 /api/voices server route
const { data: voice_lists } = await useAsyncData('voices', () => $fetch('/api/voices'), {
  default: () => ({ groups: [] })
});

const { t, locale } = useI18n();
const audioStore = useAudioStore();
const settings = useSettingsStore();
const composer = useComposerStore();

const current_locale = computed(() => locale.value);
const dark_text = computed(() => ({ 'text-grey-lighten-2': settings.dark }));

// UI 狀態
const showResetConfirm = ref(false);
const showAddSnackbar = ref(false);
const addSnackbarText = ref('');

// voiceId → group description 反查表 (給編輯區 item 顯示來源群組標籤用)
// 編輯區 items 是 localStorage 還原的,可能比 voices.json 慢一拍,所以做 computed
const voiceIdToGroup = computed(() => {
  const map = {};
  for (const g of voice_lists.value.groups) {
    for (const v of g.voice_list) {
      map[v.id] = g.group_description;
    }
  }
  return map;
});

const groupNameOf = voiceId => {
  const desc = voiceIdToGroup.value[voiceId];
  if (!desc) return '';
  return desc[current_locale.value] || desc.zh || '';
};

// 載入後處理:
// 1. reset 播放狀態 (persist 把 isPlaying / currentIndex 也存進去了,
//    refresh 後不能延續舊狀態,否則 UI 會卡住)
// 2. 清掉 stale items — 但 voice_lists 是 useAsyncData 載入 (ssr:false 走 client),
//    onMounted 時可能還沒有資料,要等 voice_lists 真的有 groups 才 prune,
//    否則 validIds 是空 set,會把使用者所有 items 都清光
onMounted(() => {
  composer.isPlaying = false;
  composer.currentIndex = -1;
});

watch(
  () => voice_lists.value?.groups?.length,
  len => {
    if (!len) return;
    const validIds = new Set();
    voice_lists.value.groups.forEach(g => g.voice_list.forEach(v => validIds.add(v.id)));
    composer.pruneStaleItems(validIds);
  },
  { immediate: true }
);

// 離開頁面 / 換路由時,如果還在播放就停止 (避免背景繼續播)
onBeforeUnmount(() => {
  if (composer.isPlaying) {
    composer.stopAll();
  }
});

// 加入語音到編輯區
const onAddVoice = item => {
  const ok = composer.add(item);
  if (ok) {
    addSnackbarText.value = t('compose.added', {
      name: item.description?.[current_locale.value] || item.description?.zh || item.name
    });
    showAddSnackbar.value = true;
  }
};

// 試聽 (單獨播一條,不會進入順序播流程) — VoiceBtn 主按鈕按下時觸發
const previewItem = item => {
  if (composer.isPlaying) return; // 順序播放中不允許試聽
  audioStore.play(item, item.description?.[current_locale.value] || item.name, t('control.full_name'), t('site.title'));
};

const onPlayAll = () => composer.playAll();
const onStop = () => composer.stopAll();

const onResetConfirm = () => {
  composer.clear();
  showResetConfirm.value = false;
};

// 播放中 currentIndex 變動時自動 scroll 到當前條 (讓使用者跟得上)
watch(
  () => composer.currentIndex,
  idx => {
    if (idx < 0) return;
    nextTick(() => {
      const items = document.querySelectorAll('.composer-item');
      const target = items[idx];
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }
);

useSeoMeta({
  title: () => t('compose.title'),
  description: () => t('compose.description'),
  robots: 'index, nofollow'
});
</script>

<style scoped>
/* ===== 編輯區卡片:用中性 bg 取代 elevation overlay 帶來的紅色 tint ===== */
.composer-card {
  background-color: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
}
.composer-toolbar {
  background-color: transparent !important;
}
.composer-list-area {
  background-color: transparent;
}

/* ===== 編輯區 item:中性灰底 + 細邊框,hover 才微亮 ===== */
.composer-list {
  list-style: none;
}
.composer-item {
  background-color: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  transition:
    background-color 0.18s,
    border-color 0.18s;
  min-height: 56px;
}
.composer-item:hover {
  background-color: rgba(255, 255, 255, 0.06);
}

/* 播放中的當前條:primary tinted bg + 左邊框條,跟其他 item 明顯區隔 */
.composer-item-playing {
  background-color: rgba(189, 19, 61, 0.14) !important;
  border-color: rgb(var(--v-theme-primary)) !important;
  border-left-width: 4px !important;
}

/* 「播放中」icon 的脈動動畫 — 多一層 a11y 視覺指示 */
.composer-playing-pulse {
  animation: composer-pulse 1.2s ease-in-out infinite;
}
@keyframes composer-pulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.55;
    transform: scale(0.92);
  }
}

/* 編號小圓 badge */
.composer-item-index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.08);
  font-size: 0.75rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.75);
  flex-grow: 0;
  flex-shrink: 0;
}
.composer-item-playing .composer-item-index {
  background-color: rgb(var(--v-theme-primary));
  color: white;
}

.composer-item-group {
  line-height: 1.2;
  font-size: 0.7rem;
  opacity: 0.6;
}
.composer-item-name {
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 移除按鈕 hover 才變紅,不要 idle 就一片紅 */
.composer-item-remove {
  opacity: 0.6;
  transition:
    opacity 0.15s,
    color 0.15s;
}
.composer-item-remove:hover {
  opacity: 1;
  color: rgb(var(--v-theme-error)) !important;
}

/* vuedraggable 拖曳中的 placeholder */
.composer-item-ghost {
  opacity: 0.4;
  background-color: rgba(189, 19, 61, 0.2);
}

.drag-handle {
  cursor: grab;
  opacity: 0.5;
  transition: opacity 0.15s;
}
.composer-item:hover .drag-handle {
  opacity: 1;
}
.drag-handle:active {
  cursor: grabbing;
}

/* ===== Divider 「從下方選擇語音」 ===== */
.compose-divider-label {
  white-space: nowrap;
  flex-shrink: 0;
}
</style>
