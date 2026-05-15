<template>
  <div>
    <!-- 搜尋列 + header-actions slot (給首頁隨機按鈕用,compose 頁可不填) -->
    <div class="d-flex align-center mb-4 ga-2">
      <v-text-field
        :model-value="searchInput"
        :placeholder="$t('search.placeholder')"
        :aria-label="$t('search.placeholder')"
        :prepend-inner-icon="mdiMagnify"
        :clearable="true"
        variant="outlined"
        density="comfortable"
        hide-details
        class="flex-grow-1"
        @update:model-value="v => (searchInput = v ?? '')"
      ></v-text-field>
      <slot name="header-actions"></slot>
    </div>

    <!-- 年份篩選 chip group -->
    <div class="d-flex mb-4">
      <v-chip-group v-model="selectedYear" mandatory selected-class="selected-year">
        <v-chip
          v-for="year in availableYears"
          :key="year"
          :value="year"
          label
          size="x-large"
          variant="outlined"
          class="font-weight-bold px-6"
        >
          {{ year === 'All' ? allYearLabel : year }}
        </v-chip>
      </v-chip-group>
    </div>

    <v-alert v-if="searchInput.trim() && filteredGroups.length === 0" type="info" variant="tonal" class="mb-4">
      {{ $t('search.no_results', { query: searchInput.trim() }) }}
    </v-alert>

    <v-expansion-panels v-model="panelModel" multiple>
      <v-expansion-panel v-for="(group, groupIdx) in filteredGroups" :id="`panel-${group.id}`" :key="group.name">
        <v-expansion-panel-title class="font-weight-bold" :class="darkText">
          <span class="text-h5">{{ group.group_description[currentLocale] }}</span>
          <v-chip size="x-small" class="mx-3 flex-grow-0" color="info" variant="outlined">
            {{ group.voice_list.length }}
          </v-chip>
          <v-btn
            v-if="showGroupCopyLink"
            tag="span"
            class="flex-grow-0"
            icon
            variant="plain"
            @click.stop="$emit('copy-link', group.id)"
          >
            <v-icon :icon="mdiLink"></v-icon>
          </v-btn>
        </v-expansion-panel-title>

        <v-expansion-panel-text class="button-panel">
          <!-- 每條語音的按鈕區。default slot:跟首頁一樣完整;
               compose 頁覆寫 slot 用 play+add 兩顆按鈕 -->
          <slot name="voice" :group="group" :group-index="groupIdx">
            <VoiceBtn
              v-for="item in group.voice_list"
              :key="item.id"
              :voice-id="item.id"
              :from-youtube="Boolean(item.url)"
              @on-play="$emit('play', item)"
              @on-youtube="$emit('youtube', item)"
              @on-download="$emit('download', item)"
            >
              {{ item.description[currentLocale] || item.description['zh'] }}
            </VoiceBtn>
          </slot>
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { mdiLink, mdiMagnify } from '@mdi/js';

// 從首頁抽出來的可重用語音列表元件 — 包含搜尋 + 年份篩選 + 群組展開面板
//
// Props:
//   groups            — 完整 voice_lists.groups (component 內部負責 filter)
//   showGroupCopyLink — 群組標題是否顯示複製連結按鈕 (首頁 true,compose 不需要)
//
// Slots:
//   header-actions    — 搜尋列右側 (首頁放隨機按鈕,compose 不放)
//   voice             — 每個群組的語音按鈕區 (預設用 VoiceBtn,compose 自訂 play+add)
//
// Emits:
//   play(voice) / youtube(voice) / download(voice)  — 預設 voice slot 觸發
//   copy-link(groupId)                              — 群組複製連結按鈕

const props = defineProps({
  groups: { type: Array, required: true },
  showGroupCopyLink: { type: Boolean, default: false }
});

defineEmits(['play', 'youtube', 'download', 'copy-link']);

const { locale } = useI18n();
const settings = useSettingsStore();

// v-model:panel 給外層做 hash scroll 用 (e.g. 首頁從 # 跳轉)
const panelModel = defineModel('panel', { type: Array, default: () => [0] });

// 搜尋分兩段:input 即時 (UI 反應),query 200ms debounced (937 條 filter 才實際算)
const searchInput = ref('');
const searchQuery = ref('');
let searchDebounceTimer = null;
watch(searchInput, val => {
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    searchQuery.value = val;
  }, 200);
});

const selectedYear = ref('All');
const currentLocale = computed(() => locale.value);
const darkText = computed(() => ({ 'text-grey-lighten-2': settings.dark }));

const availableYears = computed(() => {
  const years = new Set();
  props.groups.forEach(g => {
    g.voice_list.forEach(v => {
      if (v.year) years.add(v.year);
    });
  });
  return ['All', ...Array.from(years).sort((a, b) => b.localeCompare(a))];
});

const allYearLabel = computed(() => {
  if (currentLocale.value === 'ja') return 'すべて';
  if (currentLocale.value === 'en') return 'All';
  return '全部';
});

// filterVoiceGroups 從 app/utils/filterVoiceGroups.ts auto-import
const filteredGroups = computed(() =>
  filterVoiceGroups(props.groups, {
    year: selectedYear.value,
    query: searchQuery.value
  })
);

// debounced query 變動後展開有命中的群組 (避免打字過程不停 expand/collapse)
watch(searchQuery, val => {
  if (val.trim()) {
    panelModel.value = filteredGroups.value.map((_, idx) => idx);
  } else {
    panelModel.value = [0];
  }
});

// 暴露給父層的方法:filteredGroups 用於 hash scroll 計算 panel index
defineExpose({
  filteredGroups
});
</script>

<style scoped>
/* 年份 chip 被選中時的高亮 (對應 chip-group selected-class="selected-year") */
.selected-year {
  background-color: rgb(var(--v-theme-primary)) !important;
  color: rgba(0, 0, 0, 0.87);
}
.v-theme--dark .selected-year {
  color: white;
}
</style>
