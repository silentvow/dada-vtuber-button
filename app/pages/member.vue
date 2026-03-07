<template>
  <v-container fluid class="px-0">
    <v-row justify="center" class="ma-0">
      <v-col cols="12" class="pa-0">
        <v-card class="mx-auto rounded-lg mb-6" variant="outlined" elevation="2">
          <v-card-title class="text-h5 font-weight-bold mb-4 pt-4">
            {{ $t('member.member_area') }}
          </v-card-title>

          <v-card-text v-if="loading" class="d-flex flex-column align-center py-6">
            <v-progress-circular indeterminate color="primary"></v-progress-circular>
            <p class="my-4">{{ $t('member.loading') }}</p>
          </v-card-text>

          <v-card-text v-else-if="error">
            <v-alert type="error" variant="outlined" class="mb-4">{{ $t(error) }}</v-alert>
            <v-btn v-if="account" size="large" class="px-8" color="success" @click="fetchAccountInfo">
              {{ $t('member.refresh') }}
            </v-btn>
            <v-btn v-else size="large" variant="elevated" class="px-8" color="success" @click="redirectToDiscordAuth">
              {{ $t('member.link_discord') }}
            </v-btn>
          </v-card-text>

          <v-card-text v-else>
            <h2 class="text-h6 mb-4">{{ $t('member.welcome') }}, {{ account?.global_name }}</h2>

            <div v-if="isAuthorized">
              <v-alert type="success" variant="outlined">
                {{ $t('member.member_authorized') }}
              </v-alert>
            </div>
            <div v-else>
              <v-alert type="error" variant="outlined">
                {{ $t('member.member_unauthorized') }}
              </v-alert>
            </div>

            <div class="d-flex gap-2 mt-6">
              <v-btn v-if="!isAuthorized" color="success" size="large" class="px-8" @click="fetchAccountInfo">
                {{ $t('member.refresh') }}
              </v-btn>
              <v-btn color="error" size="large" class="px-8" @click="logout">
                {{ $t('member.unlink') }}
              </v-btn>
            </div>
          </v-card-text>
        </v-card>

        <v-expansion-panels v-if="isAuthorized" v-model="panel" multiple>
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
              <VoiceBtn
                v-for="item in group.voice_list"
                :key="item.id"
                :ref="el => setVoiceBtnRef(el, item.id)"
                :voice-id="item.id"
                :from-youtube="false"
                @on-play="play(item)"
              >
                {{ item.description[current_locale] || item.description['zh'] }}
              </VoiceBtn>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import voice_lists from '~~/assets/dc_voices.json';

const { t, locale } = useI18n();
const settings = useSettingsStore();
// 使用 Nuxt 4 內建的環境變數設定
const config = useRuntimeConfig();
// 使用 Nuxt 4 內建的 Cookie 管理 (取代原本的 cookie-universal-nuxt)
const discordCookie = useCookie('discord_token');
const { gtag } = useGtag();

// 狀態變數
const groups = ref(voice_lists.groups);
const now_playing = ref(new Set());
const loading = ref(true);
const error = ref(null);
const account = ref(null);
const member = ref(null);
const panel = ref([]);

// Refs for VoiceBtn
const voiceBtnRefs = ref(new Map());
const setVoiceBtnRef = (el, id) => {
  if (el) voiceBtnRefs.value.set(id, el);
  else voiceBtnRefs.value.delete(id);
};

// 計算屬性
const dark_text = computed(() => ({
  'text-grey-lighten-2': settings.dark
}));

const current_locale = computed(() => locale.value);

const voice_host = computed(() => {
  if (import.meta.env.PROD) {
    return 'https://cdn.jsdelivr.net/gh/silentvow/dada-vtuber-button@master/public/voices/';
  }
  return '/voices/';
});

const isAuthorized = computed(() => {
  return member.value?.roles && member.value.roles.length > 0;
});

// 生命週期：擷取網址 Hash 中的 Token
onMounted(() => {
  const hash = window.location.hash;
  if (hash && hash.includes('access_token')) {
    const params = new URLSearchParams(hash.substring(1));
    const token = params.get('access_token');
    if (token) {
      discordCookie.value = token;
      // 清理網址欄，不讓 token 留在畫面上
      window.history.replaceState(null, '', window.location.pathname);
    }
  }

  // 延遲 1 秒後開始取得帳號資訊
  setTimeout(() => fetchAccountInfo(), 1000);
});

// 方法
const fetchAccountInfo = async () => {
  loading.value = true;
  error.value = null;
  try {
    const token = discordCookie.value;
    if (!token) throw new Error(''); // 沒有 Token，觸發未登入 UI

    const headers = { Authorization: `Bearer ${token}` };
    const apiBase = config.public.DISCORD_API_BASE || 'https://discord.com/api';

    // 使用原生的 fetch 取代 axios
    const accountRes = await fetch(`${apiBase}/users/@me`, { headers });
    if (accountRes.status === 401) throw new Error('member.error_authorization_required');
    else if (accountRes.status === 403) throw new Error('member.error_forbidden');
    else if (!accountRes.ok) throw new Error('member.error_get_member');

    account.value = await accountRes.json();

    const memberRes = await fetch(`${apiBase}/users/@me/guilds/959421169629560892/member`, { headers });
    if (memberRes.status === 404) throw new Error('member.error_not_found');
    else if (!memberRes.ok) throw new Error('member.error_get_member');

    member.value = await memberRes.json();
  } catch (err) {
    error.value = err.message || 'member.error_authorization_required';
  } finally {
    loading.value = false;
  }
};

const redirectToDiscordAuth = () => {
  const clientId = config.public.DISCORD_CLIENT_ID;
  const redirectUri = config.public.DISCORD_REDIRECT_URI;
  const discordAuthUrl = `https://discord.com/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&prompt=none&scope=identify%20guilds%20guilds.members.read`;
  window.location.href = discordAuthUrl;
};

const logout = () => {
  discordCookie.value = null; // 刪除 Cookie
  account.value = null;
  member.value = null;
  error.value = 'member.error_logout';
};

const send_google_event = item => {
  if (import.meta.env.PROD && gtag) {
    gtag('event', 'play', {
      event_category: 'Audios',
      event_label: item.name + ' ' + item.description['zh']
    });
  }
};

const play = item => {
  const btnRef = voiceBtnRefs.value.get(item.id);
  let timer = null;

  // 中斷目前正在播放的語音
  now_playing.value.forEach(audio => {
    audio.pause();
    now_playing.value.delete(audio);
  });

  const clear_timer = () => {
    if (timer) clearInterval(timer);
    timer = null;
  };

  const setup_timer = audio => {
    clear_timer();
    timer = setInterval(() => {
      const prog = Number(((audio.currentTime / audio.duration) * 100).toFixed(2));
      if (btnRef) btnRef.progress = prog !== Infinity && !isNaN(prog) ? prog : 0;
    }, 50);
  };

  const smooth_end = () => {
    if (btnRef) {
      btnRef.progress = 0;
      btnRef.playing = false;
    }
  };

  const audio = new Audio(voice_host.value + item.path);
  audio.load();

  if ('mediaSession' in navigator) {
    const metadata = {
      title: item.description[current_locale.value],
      artist: t('control.full_name'),
      album: t('site.title'),
      artwork: [{ src: '/img/media-cover.png', sizes: '128x128', type: 'image/png' }]
    };
    navigator.mediaSession.metadata = new window.MediaMetadata(metadata);
    navigator.mediaSession.playbackState = 'playing';
  }

  audio.addEventListener('canplay', () => {
    audio.volume = settings.volume * 0.01;
    audio.play();
    now_playing.value.add(audio);
    send_google_event(item);
    if (btnRef) btnRef.playing = true;
    setup_timer(audio);
  });

  audio.addEventListener('ended', () => {
    smooth_end();
    clear_timer();
    now_playing.value.delete(audio);
  });

  audio.addEventListener('pause', () => {
    smooth_end();
    clear_timer();
    now_playing.value.delete(audio);
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'paused';
    }
  });
};

useHead({
  title: computed(() => `${t('member.member_area')} - ${t('site.title')}`)
});
</script>

<style scoped>
.gap-2 {
  gap: 8px;
}
</style>
