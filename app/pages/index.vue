<template>
  <v-container class="d-flex flex-column align-center px-0" fluid>
    <v-col cols="12" class="pa-0" style="min-width: 85%">
      <v-expansion-panels v-model="panel" multiple>
        <v-expansion-panel v-for="group in groups" :id="`panel-${group.id}`" :key="group.name">
          <v-expansion-panel-title class="font-bold" :class="dark_text">
            <span class="text-2xl">{{ group.group_description[current_locale] }}</span>
            <v-chip size="x-small" class="mx-3 flex-grow-0" color="info" variant="outlined">
              {{ group.voice_list.length }}
            </v-chip>
            <v-btn tag="span" class="flex-grow-0" icon variant="plain" @click.stop="copyLink(group.id)">
              <v-icon icon="mdi-link"></v-icon>
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
import voice_lists from '~~/assets/voices.json';

// 全域工具
const { t, locale } = useI18n();
const audioStore = useAudioStore();
const settings = useSettingsStore();
const snackbar = useSnackbar();
// 如果有使用 nuxt-gtag，可以用這個來送 GA 事件
const { gtag } = useGtag();

// 狀態變數
const groups = ref(voice_lists.groups);
const panel = ref([0]);
const is_dialog_open = ref(false);
const dialog_item = ref({ description: {}, url: '' });

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
        const interval = setInterval(() => {
          const el = document.getElementById(`panel-${hash}`);
          if (el) {
            clearInterval(interval);
            panel.value = [groupIndex];
            const y = el.getBoundingClientRect().top + window.scrollY - 64;
            window.scrollTo({ top: y });
          }
        }, 100);
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
  const url = window.location.host + '/#' + groupId;
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

// Meta 標籤設定
useHead({
  title: computed(() => t('site.title'))
});
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
</style>
