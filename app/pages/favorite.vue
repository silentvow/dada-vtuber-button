<template>
  <v-container fluid class="px-0">
    <v-row justify="center" class="ma-0">
      <v-col cols="12" class="pa-0" style="min-width: 85%">
        <v-card v-for="group in groups" :key="group.name" class="rounded-lg" elevation="2">
          <v-card-title class="font-weight-bold" :class="dark_text">
            {{ group.group_description[current_locale] }}
          </v-card-title>

          <v-card-text class="button-panel pt-2">
            <div v-if="group.voice_list.length === 0" class="text-center py-6 text-grey">
              {{ $t('favorite.empty') }}
            </div>

            <div v-else class="d-flex flex-wrap gap-2">
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
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

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
          :style="{ width: 'calc(100% - 40px)', height: 'auto', aspectRatio: '16/9' }"
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
import { ref, computed, watch, onMounted } from 'vue';
import { useAudioStore } from '~/stores/audio';
import { useSettingsStore } from '~/stores/settings';
import { useFavoriteStore } from '~/stores/favorite';

// voices.json runtime fetch (見 index.vue 註解)
const { data: voice_lists } = await useAsyncData('voices', () => $fetch('/api/voices'), {
  default: () => ({ groups: [] })
});

const { t, locale } = useI18n();
const audioStore = useAudioStore();
const settings = useSettingsStore();
const favoriteStore = useFavoriteStore();
const { gtag } = useGtag();

// 狀態變數
const is_dialog_open = ref(false);
const dialog_item = ref({ description: {}, url: '' });

// 建立全域 Voice Map 以供快速查找 (改 computed,因為 voice_lists 是 ref)
const voiceMap = computed(
  () => new Map(voice_lists.value.groups.flatMap(i => i.voice_list.map(v => [v.id.slice(0, 13), v])))
);

// 計算屬性
const current_locale = computed(() => locale.value);

// 關鍵修改：從 Pinia 取得最愛清單
const groups = computed(() => {
  return [
    {
      id: 'favorite',
      name: 'favorite',
      group_description: {
        zh: '我的最愛',
        en: 'Favorite',
        ja: 'お気に入り'
      },
      voice_list: favoriteStore.favorites.map(id => voiceMap.value.get(id)).filter(v => !!v)
    }
  ];
});

const voice_host = computed(() => {
  if (import.meta.env.PROD) {
    return 'https://cdn.jsdelivr.net/gh/silentvow/dada-vtuber-button@master/public/voices/';
  }
  return '/voices/';
});

const dark_text = computed(() => ({
  'text-grey-lighten-2': settings.dark
}));

// 監聽彈窗關閉
watch(is_dialog_open, newVal => {
  if (!newVal) {
    dialog_item.value = { description: {}, url: '' };
  }
});

// 生命週期
onMounted(() => {
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

const openModal = item => {
  dialog_item.value = item;
  is_dialog_open.value = true;
};

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
  const favGroup = groups.value[0];
  if (!favGroup || !favGroup.voice_list || favGroup.voice_list.length === 0) return;

  const random_item = favGroup.voice_list[get_random_int(favGroup.voice_list.length)];
  play(random_item);
};

const stop_all = () => audioStore.stopAll();

// Meta 標籤設定 (套用 app.vue 的 titleTemplate)
useSeoMeta({
  title: () => t('site.favorite')
});
</script>

<style scoped>
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
