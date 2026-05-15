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
              <VoiceBtn
                v-for="item in group.voice_list"
                :key="item.id"
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
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { mdiLink } from '@mdi/js';
// 💡 引入 AudioStore 與 Snackbar
import { useAudioStore } from '~/stores/audio';
import { useSnackbar } from '~/composables/useSnackbar';

// 會員頁走 Discord OAuth (client-only),不參與 SSG 預渲染
definePageMeta({
  ssr: false
});

// dc_voices.json (~400KB) 直接從 public/ 靜態檔抓 (避免內聯進 client JS bundle)。
// 重要:不能用 $fetch('/api/dc_voices') — 那是 nitro server route,只在 prerender
// (SSR) 階段被內部命中。member 頁是 ssr:false + 不被 prerender (在 nitro.ignore),
// 所以 client 端 runtime 真的會打 /api/dc_voices,SSG 靜態 hosting 沒這 endpoint → 404。
// /dc_voices.json 是 public/ 下的 static file,SSG output 直接 copy 過去,runtime 抓得到。
const { data: voice_lists } = await useAsyncData('dc_voices', () => $fetch('/dc_voices.json'), {
  default: () => ({ groups: [] })
});

const { t, locale } = useI18n();
const settings = useSettingsStore();
const audioStore = useAudioStore();
const snackbar = useSnackbar();
const config = useRuntimeConfig();
const discordCookie = useCookie('discord_token');
const { gtag } = useGtag();

// 狀態變數 (改 computed 跟著 voice_lists ref 變動)
const groups = computed(() => voice_lists.value.groups);
// 💡 移除了 `now_playing` 與 `voiceBtnRefs` 等舊版手動管理的狀態
const loading = ref(true);
const error = ref(null);
const account = ref(null);
const member = ref(null);
const panel = ref([]);
const abortController = ref(null);

// 計算屬性
const dark_text = computed(() => ({
  'text-grey-lighten-2': settings.dark
}));

const current_locale = computed(() => locale.value);

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
      window.history.replaceState(null, '', window.location.pathname);
    }
  }

  abortController.value = new AbortController();
  fetchAccountInfo(abortController.value.signal);
});

onUnmounted(() => {
  abortController.value?.abort();
});

// 方法
const fetchAccountInfo = async signal => {
  loading.value = true;
  error.value = null;
  try {
    const token = discordCookie.value;
    if (!token) throw new Error('');

    const headers = { Authorization: `Bearer ${token}` };
    const apiBase = config.public.DISCORD_API_BASE || 'https://discord.com/api';

    const accountRes = await fetch(`${apiBase}/users/@me`, { headers, signal });
    if (accountRes.status === 401) throw new Error('member.error_authorization_required');
    else if (accountRes.status === 403) throw new Error('member.error_forbidden');
    else if (!accountRes.ok) throw new Error('member.error_get_member');

    account.value = await accountRes.json();

    const memberRes = await fetch(`${apiBase}/users/@me/guilds/959421169629560892/member`, { headers, signal });
    if (memberRes.status === 404) throw new Error('member.error_not_found');
    else if (!memberRes.ok) throw new Error('member.error_get_member');

    member.value = await memberRes.json();
  } catch (err) {
    if (err.name === 'AbortError') return;
    error.value = err.message || 'member.error_authorization_required';
  } finally {
    if (!signal?.aborted) loading.value = false;
  }
};

const redirectToDiscordAuth = () => {
  const clientId = config.public.DISCORD_CLIENT_ID;
  const redirectUri = config.public.DISCORD_REDIRECT_URI;
  const discordAuthUrl = `https://discord.com/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&prompt=none&scope=identify%20guilds%20guilds.members.read`;
  window.location.href = discordAuthUrl;
};

const logout = () => {
  discordCookie.value = null;
  account.value = null;
  member.value = null;
  error.value = 'member.error_logout';
};

// 💡 補上 Template 裡呼叫但遺失的 copyLink 函數
const copyLink = id => {
  const url = `${window.location.origin}${window.location.pathname}#panel-${id}`;
  navigator.clipboard.writeText(url).then(() => {
    snackbar.show(t('action.copy_link'));
  });
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
  audioStore.play(item, item.description[current_locale.value], t('control.full_name'), t('site.title'));
  send_google_event(item);
};

useSeoMeta({
  title: () => t('member.member_area'),
  robots: 'noindex, nofollow' // 會員專區需 Discord OAuth,不應被索引
});
</script>

<style scoped>
.gap-2 {
  gap: 8px;
}
</style>
