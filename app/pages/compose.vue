<template>
  <v-container class="d-flex flex-column align-center px-0 pt-0" fluid>
    <v-col cols="12" class="pa-0" style="min-width: 85%">
      <!-- Header:標題 + 計數 -->
      <div class="d-flex align-end justify-space-between flex-wrap mb-2 gap-2">
        <div>
          <h1 class="text-h4 font-weight-bold" :class="dark_text">{{ $t('compose.title') }}</h1>
          <p class="text-body-2 mt-1 mb-0 text-medium-emphasis">{{ $t('compose.description') }}</p>
        </div>
        <v-chip
          :color="composer.isFull ? 'error' : 'info'"
          variant="elevated"
          size="large"
          label
          class="font-weight-bold"
          :aria-label="$t('compose.count', { count: composer.count, max: MAX_ITEMS })"
        >
          {{ $t('compose.count', { count: composer.count, max: MAX_ITEMS }) }}
        </v-chip>
      </div>

      <!-- 編輯區 -->
      <v-card variant="outlined" class="mb-6 rounded-lg" elevation="2">
        <!-- Control bar:播放 / 循環 / 重置 -->
        <v-toolbar density="comfortable" color="surface" class="px-3 rounded-t-lg">
          <div class="d-flex gap-2 flex-wrap py-2">
            <v-btn
              v-if="!composer.isPlaying"
              :prepend-icon="mdiPlayCircleOutline"
              :disabled="composer.isEmpty"
              color="primary"
              rounded="lg"
              class="text-none"
              @click="onPlayAll"
            >
              {{ $t('compose.play_all') }}
            </v-btn>
            <v-btn
              v-else
              :prepend-icon="mdiStopCircleOutline"
              color="error"
              rounded="lg"
              class="text-none"
              @click="onStop"
            >
              {{ $t('compose.stop') }}
            </v-btn>

            <v-btn
              :prepend-icon="mdiRepeat"
              :color="composer.loop ? 'primary' : ''"
              rounded="lg"
              class="text-none"
              :aria-pressed="composer.loop"
              @click="composer.toggleLoop"
            >
              {{ composer.loop ? $t('compose.loop_on') : $t('compose.loop') }}
            </v-btn>

            <v-btn
              :prepend-icon="mdiTrashCanOutline"
              :disabled="composer.isEmpty || composer.isPlaying"
              color="error"
              rounded="lg"
              variant="outlined"
              class="text-none"
              @click="showResetConfirm = true"
            >
              {{ $t('compose.reset') }}
            </v-btn>
          </div>
        </v-toolbar>

        <v-divider></v-divider>

        <!-- 編輯區內容:空 / draggable list -->
        <v-card-text class="pa-3" style="min-height: 120px">
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
                class="composer-item d-flex align-center gap-2 pa-2 mb-2 rounded"
                :class="{ 'composer-item-playing': composer.currentIndex === index }"
              >
                <!-- Drag handle -->
                <v-btn
                  :icon="mdiDragVertical"
                  :aria-label="$t('compose.drag_handle')"
                  variant="text"
                  density="comfortable"
                  size="small"
                  class="drag-handle flex-grow-0"
                  :disabled="composer.isPlaying"
                ></v-btn>

                <!-- 順序編號 -->
                <span class="text-body-1 font-weight-bold text-medium-emphasis" style="min-width: 2.5rem">
                  {{ index + 1 }}.
                </span>

                <!-- 語音名稱 -->
                <span class="text-body-1 flex-grow-1" :class="dark_text">
                  {{ element.description[current_locale] || element.description.zh || element.name }}
                </span>

                <!-- 試聽 -->
                <v-btn
                  :prepend-icon="mdiPlayOutline"
                  :aria-label="$t('action.play_option')"
                  size="small"
                  rounded="lg"
                  class="text-none flex-grow-0"
                  :disabled="composer.isPlaying"
                  @click="previewItem(element)"
                >
                  {{ $t('action.play_option') }}
                </v-btn>

                <!-- 移除 -->
                <v-btn
                  :prepend-icon="mdiCloseCircleOutline"
                  :aria-label="$t('compose.remove_item') + '：' + (element.description[current_locale] || element.name)"
                  color="error"
                  size="small"
                  rounded="lg"
                  variant="outlined"
                  class="text-none flex-grow-0"
                  :disabled="composer.isPlaying"
                  @click="composer.remove(element.instanceId)"
                >
                  {{ $t('compose.remove_item') }}
                </v-btn>
              </li>
            </template>
          </draggable>
        </v-card-text>
      </v-card>

      <!-- 語音列表 (沿用首頁元件,差別在 voice slot 改成 play+add) -->
      <VoiceListWithSearch :groups="voice_lists.groups" @play="previewItem">
        <template #voice="{ group }">
          <div class="d-flex flex-wrap gap-2 pt-2">
            <div v-for="item in group.voice_list" :key="item.id" class="d-flex gap-1 align-center">
              <v-btn
                :prepend-icon="mdiPlayOutline"
                :aria-label="$t('action.play_option') + '：' + (item.description[current_locale] || item.name)"
                size="default"
                rounded="lg"
                class="text-none"
                @click="previewItem(item)"
              >
                {{ item.description[current_locale] || item.description.zh || item.name }}
              </v-btn>
              <v-btn
                :prepend-icon="mdiPlusCircleOutline"
                :aria-label="$t('compose.add_to_editor') + '：' + (item.description[current_locale] || item.name)"
                color="primary"
                size="default"
                rounded="lg"
                class="text-none"
                :disabled="composer.isFull || composer.isPlaying"
                @click="onAddVoice(item)"
              >
                {{ composer.isFull ? $t('compose.full_message', { max: MAX_ITEMS }) : $t('compose.add_to_editor') }}
              </v-btn>
            </div>
          </div>
        </template>
      </VoiceListWithSearch>
    </v-col>

    <!-- Reset 確認 dialog (一律 confirm,不分項目數) -->
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
          <v-btn rounded="lg" class="text-none" @click="showResetConfirm = false">
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
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import draggable from 'vuedraggable';
import {
  mdiPlayCircleOutline,
  mdiStopCircleOutline,
  mdiRepeat,
  mdiTrashCanOutline,
  mdiDragVertical,
  mdiPlayOutline,
  mdiCloseCircleOutline,
  mdiPlusCircleOutline,
  mdiMusicBoxMultipleOutline,
  mdiInformationOutline
} from '@mdi/js';
import { useComposerStore, MAX_ITEMS } from '~/stores/composer';

// 純互動頁,不參與 SSG 預渲染 (狀態本來就在 client localStorage)
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

// 試聽 (單獨播一條,不會進入順序播流程)
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
  // 純互動頁,不需要被搜尋引擎收錄太重 (但 nav 進得來,不擋 index)
  robots: 'index, nofollow'
});
</script>

<style scoped>
.composer-list {
  list-style: none;
}

.composer-item {
  background-color: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  transition:
    background-color 0.2s,
    border-color 0.2s,
    transform 0.2s;
}

.composer-item:hover {
  background-color: rgba(255, 255, 255, 0.08);
}

/* 播放中當前條的 highlight */
.composer-item-playing {
  background-color: rgba(189, 19, 61, 0.18) !important; /* primary tint */
  border-color: rgb(var(--v-theme-primary)) !important;
  box-shadow: 0 0 0 1px rgb(var(--v-theme-primary));
}

/* vuedraggable 拖曳中的 placeholder 樣式 */
.composer-item-ghost {
  opacity: 0.4;
  background-color: rgba(189, 19, 61, 0.2);
}

.drag-handle {
  cursor: grab;
}
.drag-handle:active {
  cursor: grabbing;
}
</style>
