<template>
  <v-container class="d-flex flex-column align-center px-0 pt-0" fluid>
    <v-col cols="12" class="pa-0" style="min-width: 85%">
      <VoiceListWithSearch
        ref="voiceListRef"
        v-model:panel="panel"
        :groups="voice_lists.groups"
        :show-group-copy-link="true"
        @play="play"
        @youtube="openModal"
        @download="download"
        @copy-link="copyLink"
      >
        <template #header-actions>
          <v-btn
            :prepend-icon="mdiShuffle"
            :aria-label="$t('control.random')"
            :loading="isRandomLoading"
            :disabled="isRandomLoading"
            color="primary"
            rounded="lg"
            height="48"
            class="text-none"
            @click="play_random_voice"
          >
            {{ $t('control.random') }}
          </v-btn>
        </template>
      </VoiceListWithSearch>
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

    <!-- 隨機播放專用 snackbar:由 audio onStart/onEnd 控制顯隱,
         timeout=-1 表示不自動消失 (audio ended/error 時才隱藏) -->
    <v-snackbar v-model="showRandomSnackbar" :timeout="-1" location="top" color="success" elevation="6">
      {{ randomSnackbarText }}
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import { mdiShuffle } from '@mdi/js';

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
const voiceListRef = ref(null);
const panel = ref([0]);
const is_dialog_open = ref(false);
const dialog_item = ref({ description: {}, url: '' });

// 隨機播放按鈕 loading state + 自製 snackbar (由 audio 事件控制,不用全域 useSnackbar)
const isRandomLoading = ref(false);
const showRandomSnackbar = ref(false);
const randomSnackbarText = ref('');

// 計算屬性
const current_locale = computed(() => locale.value);

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
  // Hash 滾動跳轉邏輯:用 ref 取 voiceListRef 暴露的 filteredGroups
  const hash = window.location.hash.replace('#', '');
  if (hash) {
    nextTick(() => {
      requestAnimationFrame(() => {
        const filteredGroups = voiceListRef.value?.filteredGroups || [];
        const groupIndex = filteredGroups.findIndex(g => g.id === hash);
        if (groupIndex !== -1) {
          const el = document.getElementById(`panel-${hash}`);
          if (el) {
            panel.value = [groupIndex];
            const y = el.getBoundingClientRect().top + window.scrollY - 64;
            window.scrollTo({ top: y });
          }
        }
      });
    });
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
  a.href = getPrimaryVoiceUrl(item.path);
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
    item.description[current_locale.value],
    t('control.full_name'),
    t('site.title'),
    play_random_voice
  );
  send_google_event(item);
};

// 全域隨機:不受搜尋/年份 filter 影響,從所有 voices 挑一個 (使用者選 A)
// pickRandomVoice util 從 app/utils/pickRandomVoice.ts auto-import
//
// 流程:
// 1. 按下按鈕 → isRandomLoading=true (button 進入 loading,disabled 防連點)
// 2. audio canplay 事件 → onStart → 彈 snackbar (時間點是「真的開始播」而非「按下去」)
// 3. audio ended/error → onEnd/onError → loading=false + snackbar 收起
//    (snackbar timeout=-1,只靠這裡控制,跟著音檔長度顯示)
const play_random_voice = () => {
  const pick = pickRandomVoice(voice_lists.value.groups);
  if (!pick) return;

  isRandomLoading.value = true;
  showRandomSnackbar.value = false; // 收掉前一個 snackbar (若有)

  const groupName = pick.group.group_description?.[current_locale.value] || pick.group.group_name || '';
  const voiceText = pick.voice.description?.[current_locale.value] || pick.voice.description?.zh || pick.voice.name;
  const snackbarText = t('action.now_playing', { group: groupName, voice: voiceText });

  audioStore.play(
    pick.voice,
    pick.voice.description?.[current_locale.value] || pick.voice.name,
    t('control.full_name'),
    t('site.title'),
    play_random_voice, // onRandomNext (audio store 隨機模式 hook,目前無 UI 切換)
    {
      onStart: () => {
        randomSnackbarText.value = snackbarText;
        showRandomSnackbar.value = true;
      },
      onEnd: () => {
        isRandomLoading.value = false;
        showRandomSnackbar.value = false;
      },
      onError: () => {
        isRandomLoading.value = false;
        showRandomSnackbar.value = false;
      }
    }
  );
  send_google_event(pick.voice);
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
