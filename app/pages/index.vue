<template>
  <v-container class="d-flex flex-column align-center px-0 pt-0" fluid>
    <v-col cols="12" class="pa-0" style="min-width: 85%">
      <v-text-field
        v-model="searchInput"
        :placeholder="$t('search.placeholder')"
        :aria-label="$t('search.placeholder')"
        :prepend-inner-icon="mdiMagnify"
        :clearable="true"
        variant="outlined"
        density="comfortable"
        hide-details
        class="mb-4"
      ></v-text-field>

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

      <v-alert v-if="searchInput.trim() && groups.length === 0" type="info" variant="tonal" class="mb-4">
        {{ $t('search.no_results', { query: searchInput.trim() }) }}
      </v-alert>

      <v-expansion-panels v-model="panel" multiple>
        <v-expansion-panel v-for="group in groups" :id="`panel-${group.id}`" :key="group.name">
          <v-expansion-panel-title class="font-weight-bold" :class="dark_text">
            <span class="text-h5">{{ group.group_description[current_locale] }}</span>
            <v-chip size="x-small" class="mx-3 flex-grow-0" color="info" variant="outlined">
              {{ group.voice_list.length }}
            </v-chip>
            <v-btn tag="span" class="flex-grow-0" icon variant="plain" @click.stop="copyLink(group.id)">
              <v-icon :icon="mdiLink"></v-icon>
            </v-btn>
          </v-expansion-panel-title>

          <v-expansion-panel-text class="button-panel">
            <!-- <div class="d-flex flex-wrap gap-2 pt-2"> -->
            <VoiceBtn
              v-for="item in group.voice_list"
              :key="item.id"
              :voice-id="item.id"
              :from-youtube="Boolean(item.url)"
              @on-play="play(item)"
              @on-youtube="openModal(item)"
              @on-download="download(item)"
            >
              {{ item.description[current_locale] || item.description['zh'] }}
            </VoiceBtn>
            <!-- </div> -->
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </v-col>

    <v-col cols="12" class="pa-0 mt-12" style="min-width: 85%">
      <section aria-labelledby="faq-heading" class="faq-section">
        <h2 id="faq-heading" class="text-h5 font-weight-bold mb-4" :class="dark_text">
          {{ $t('faq.title') }}
        </h2>
        <v-expansion-panels variant="accordion">
          <v-expansion-panel v-for="i in 5" :key="`faq-${i}`">
            <v-expansion-panel-title class="font-weight-bold" :class="dark_text">
              <h3 class="faq-question text-h6 ma-0">{{ $t(`faq.q${i}`) }}</h3>
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <p class="faq-answer">{{ $t(`faq.a${i}`) }}</p>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </section>
    </v-col>

    <v-dialog v-model="is_dialog_open" max-width="600px">
      <v-card>
        <v-card-title>
          {{ `${$t('site.voice')}：${dialog_item.description[current_locale]}` }}
        </v-card-title>
        <v-card-text>
          <span>{{ $t('site.source') }}：</span>
          <a :href="dialog_item.url" target="_blank" rel="noreferrer" class="text-primary">{{ dialog_item.url }}</a>
        </v-card-text>
        <iframe
          v-if="dialog_item.url"
          class="mx-auto d-block"
          :src="`https://www.youtube.com/embed/${dialog_item.url.slice(-11)}`"
          frameborder="0"
          allowfullscreen
          :style="{
            width: 'calc(100% - 40px)',
            height: 'auto',
            aspectRatio: '16/9'
          }"
        ></iframe>
        <v-card-actions>
          <v-btn class="ml-auto px-6" color="primary" variant="flat" @click="is_dialog_open = false">
            {{ $t('control.disabled') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import { mdiLink, mdiMagnify } from '@mdi/js';

// voices.json (~500KB) 改走 /api/voices server route,不再內聯進 client JS bundle
// SSG prerender: server route 用 import 讀檔 → useAsyncData 結果寫入 _payload.json
// Client hydration: 從 payload 反序列化,不重複 fetch
const { data: voice_lists } = await useAsyncData('voices', () => $fetch('/api/voices'), {
  default: () => ({ groups: [] })
});

// 全域工具
const { t, locale } = useI18n();
const audioStore = useAudioStore();
const settings = useSettingsStore();
const snackbar = useSnackbar();
// 如果有使用 nuxt-gtag，可以用這個來送 GA 事件
const { gtag } = useGtag();

// 狀態變數
const panel = ref([0]);
const is_dialog_open = ref(false);
const dialog_item = ref({ description: {}, url: '' });

const selectedYear = ref('All');

// 搜尋分兩個 ref:input 給 v-model 即時更新 (responsive UI),
// query 是 debounced 過的值,觸發 voice list filter (~200ms 後才重新算)
// 937 條 client filter 雖快,但 Vue 重 render 整批 voice-button 在中低階機型上會卡
const searchInput = ref('');
const searchQuery = ref('');
let searchDebounceTimer = null;
watch(searchInput, val => {
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    searchQuery.value = val;
  }, 200);
});

// 💡 2. 動態從 json 提取所有年份，並由新到舊排序
const availableYears = computed(() => {
  const years = new Set();
  voice_lists.value.groups.forEach(g => {
    g.voice_list.forEach(v => {
      if (v.year) years.add(v.year);
    });
  });
  // 回傳 ['All', '2024', '2023', ...]
  return ['All', ...Array.from(years).sort((a, b) => b.localeCompare(a))];
});

// 💡 3. 多語系「全部」按鈕的顯示文字
const allYearLabel = computed(() => {
  if (current_locale.value === 'ja') return 'すべて';
  if (current_locale.value === 'en') return 'All';
  return '全部';
});

// 💡 4. 群組過濾:年份 + 搜尋 (filterVoiceGroups util 處理)
const groups = computed(() =>
  filterVoiceGroups(voice_lists.value.groups, {
    year: selectedYear.value,
    query: searchQuery.value
  })
);

// debounced query 變動後再展開有命中的群組
// (用 searchQuery 不用 searchInput,避免打字過程不停 expand/collapse)
watch(searchQuery, val => {
  if (val.trim()) {
    panel.value = groups.value.map((_, idx) => idx);
  } else {
    panel.value = [0];
  }
});

// 計算屬性
const current_locale = computed(() => locale.value);

const voice_host = computed(() => {
  // Vite 環境變數判斷 (取代舊版的 process.env)
  if (import.meta.env.PROD) {
    return 'https://cdn.jsdelivr.net/gh/silentvow/dada-vtuber-button@master/public/voices/';
  }
  return '/voices/';
});

const dark_text = computed(() => ({
  'text-grey-lighten-2': settings.dark
}));

// 監聽彈窗關閉，清空資料
watch(is_dialog_open, newVal => {
  if (!newVal) {
    dialog_item.value = { description: {}, url: '' };
  }
});

// 生命週期與初始化
onMounted(() => {
  // Hash 滾動跳轉邏輯
  const hash = window.location.hash.replace('#', '');
  if (hash) {
    const groupIndex = groups.value.findIndex(g => g.id === hash);
    if (groupIndex !== -1) {
      nextTick(() => {
        requestAnimationFrame(() => {
          const el = document.getElementById(`panel-${hash}`);
          if (el) {
            panel.value = [groupIndex];
            const y = el.getBoundingClientRect().top + window.scrollY - 64;
            window.scrollTo({ top: y });
          }
        });
      });
    }
  }

  // Media Session Metadata 整合
  if ('mediaSession' in navigator) {
    navigator.mediaSession.setActionHandler('nexttrack', play_random_voice);
    navigator.mediaSession.setActionHandler('previoustrack', play_random_voice);
    navigator.mediaSession.setActionHandler('pause', () => {
      stop_all();
      navigator.mediaSession.playbackState = 'paused';
    });
  }
});

// 方法
const send_google_event = item => {
  if (import.meta.env.PROD && gtag) {
    gtag('event', 'play', {
      event_category: 'Audios',
      event_label: item.name + ' ' + item.description['zh']
    });
  }
};

const download = item => {
  const a = document.createElement('a');
  a.target = '_blank';
  a.href = voice_host.value + item.path;
  a.download = item.path.split('/').pop();
  a.click();
};

const copyLink = groupId => {
  // 帶上當前語系 path,讓接收連結的人看到的是分享者當下的語系
  const url = window.location.origin + window.location.pathname.replace(/\/$/, '') + '/#' + groupId;
  navigator.clipboard.writeText(url).then(() => {
    snackbar.show(t('action.copy_link'));
  });
};

const openModal = item => {
  dialog_item.value = item;
  is_dialog_open.value = true;
};

// 核心播放邏輯
const play = item => {
  audioStore.play(
    item,
    voice_host.value,
    item.description[current_locale.value],
    t('control.full_name'),
    t('site.title'),
    play_random_voice
  );
  send_google_event(item);
};

const get_random_int = max => Math.floor(Math.random() * Math.floor(max));

const play_random_voice = () => {
  const random_list = groups.value[get_random_int(groups.value.length)];
  const random_item = random_list.voice_list[get_random_int(random_list.voice_list.length)];
  play(random_item);
};

const stop_all = () => audioStore.stopAll();

// Meta 標籤設定 (基礎 SEO 由 app.vue 設定;此頁為根頁面)
// title 顯式設空字串,避免 nuxt-seo-utils 從 i18n route name (ja/en) 自動帶 "Ja"/"En" 前綴
useSeoMeta({
  title: '',
  description: () => t('site.description'),
  ogDescription: () => t('site.description')
});

// FAQPage 結構化資料 — 對應頁面下方可見的 FAQ 區塊 (Google 規範要求)
useSchemaOrg([
  {
    '@type': 'FAQPage',
    mainEntity: Array.from({ length: 5 }, (_, i) => ({
      '@type': 'Question',
      name: t(`faq.q${i + 1}`),
      acceptedAnswer: {
        '@type': 'Answer',
        text: t(`faq.a${i + 1}`)
      }
    }))
  }
]);
</script>

<style scoped>
/* 模擬 v-speed-dial 的排版 */
.speed-dial-container {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 100;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.speed-dial-actions {
  gap: 8px;
}

.gap-2 {
  gap: 8px;
}

.selected-year {
  background-color: rgb(var(--v-theme-primary)) !important;
  color: rgba(0, 0, 0, 0.87);
}

.v-theme--dark.selected-year {
  color: white;
}

/* FAQ 區塊 — 視覺輕量,避免搶語音清單焦點 */
.faq-section :deep(.v-expansion-panel-title) {
  min-height: 56px;
}
.faq-question {
  display: inline-block;
  font-weight: 600;
}
.faq-answer {
  line-height: 1.7;
  white-space: pre-wrap;
}
</style>
