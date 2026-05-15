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

            <div class="d-flex ga-2 mt-6">
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
import dcVoices from '~~/public/dc_voices.json';
import { useAudioStore } from '~/stores/audio';
import { useSnackbar } from '~/composables/useSnackbar';

// 會員頁走 Discord OAuth (client-only),不參與 SSG 預渲染
definePageMeta({
  ssr: false
});

// dc_voices.json (~400KB) 直接 import,讓 Vite 內聯進 member 頁的 chunk。
//
// 歷史:
//   PR8 改成 $fetch('/api/dc_voices') server route (不出貨進 client bundle)
//   PR17 因為 SSG 靜態 hosting 沒 runtime api,改成 $fetch('/dc_voices.json')
//   PR19 (本次) 因 useAsyncData('dc_voices', $fetch('/dc_voices.json')) 在
//        ssr:false + Vercel preset + SPA navigation 路徑下 voice_lists.value
//        會變空 object {} (花了一小時 debug 找不到原因),直接 import 最可靠。
//
// 代價:member 頁的 chunk 多 ~400KB,但 member 是低流量頁 (有 Discord 才看),
//      初次載入慢一點 OK。

const { t, locale } = useI18n();
const settings = useSettingsStore();
const audioStore = useAudioStore();
const snackbar = useSnackbar();
const config = useRuntimeConfig();
const { gtag } = useGtag();

// === Discord OAuth state (cookies) ===
// PR18: 從 Implicit Grant 換成 Authorization Code Grant + refresh token。
// 三個 cookies 一起管:
//   discord_access_token   — 7 天有效,呼叫 Discord API 用
//   discord_refresh_token  — 長效,access 過期時用來換新的
//   discord_token_expires_at — ms unix timestamp,client 端判斷是否該 refresh
// 設 maxAge 30 天 (refresh 通常比 access 長壽,可以更長)
const COOKIE_OPTS = { maxAge: 60 * 60 * 24 * 30 };
const accessTokenCookie = useCookie('discord_access_token', COOKIE_OPTS);
const refreshTokenCookie = useCookie('discord_refresh_token', COOKIE_OPTS);
const expiresAtCookie = useCookie('discord_token_expires_at', COOKIE_OPTS);

// 狀態變數 — groups 直接從 import 來,不需 reactive
const groups = dcVoices.groups;
const loading = ref(true);
const error = ref(null);
const account = ref(null);
const member = ref(null);
const panel = ref([]);
const abortController = ref(null);

// 計算屬性
const dark_text = computed(() => ({ 'text-grey-lighten-2': settings.dark }));
const current_locale = computed(() => locale.value);
const isAuthorized = computed(() => member.value?.roles && member.value.roles.length > 0);

// === Token helpers ===

// 把 server 回傳的 token bundle 存進 cookies
const saveTokens = bundle => {
  accessTokenCookie.value = bundle.access_token;
  refreshTokenCookie.value = bundle.refresh_token;
  expiresAtCookie.value = String(bundle.expires_at);
};

const clearTokens = () => {
  accessTokenCookie.value = null;
  refreshTokenCookie.value = null;
  expiresAtCookie.value = null;
};

// Access token 是否快到期 (預留 1 分鐘 buffer)
const isAccessTokenExpiring = () => {
  if (!expiresAtCookie.value) return false;
  const expiresAt = parseInt(expiresAtCookie.value, 10);
  if (isNaN(expiresAt)) return true;
  return Date.now() >= expiresAt - 60_000;
};

// 用 refresh_token 跟 server 換新的 access token,失敗回 false (代表需要重新授權)
const tryRefresh = async () => {
  if (!refreshTokenCookie.value) return false;
  try {
    const bundle = await $fetch('/api/discord/refresh', {
      method: 'POST',
      body: { refresh_token: refreshTokenCookie.value }
    });
    saveTokens(bundle);
    return true;
  } catch (err) {
    console.warn('[member] refresh failed', err);
    clearTokens();
    return false;
  }
};

// 取得有效的 access token:過期就先 refresh,還是失敗就回 null
const getValidAccessToken = async () => {
  if (!accessTokenCookie.value) return null;
  if (isAccessTokenExpiring()) {
    const ok = await tryRefresh();
    if (!ok) return null;
  }
  return accessTokenCookie.value;
};

// === Lifecycle / Auth flow ===

// 進頁時:處理 OAuth callback (URL 帶 ?code=...) 或直接用既有 token
onMounted(async () => {
  abortController.value = new AbortController();

  const url = new URL(window.location.href);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const oauthError = url.searchParams.get('error');

  if (oauthError) {
    // Discord 端拒絕授權 (例如使用者點 cancel)
    cleanUrl();
    error.value = 'member.error_authorization_required';
    loading.value = false;
    return;
  }

  if (code) {
    // CSRF 防護:驗證 state 跟我們 redirect 前存的一致
    const expectedState = sessionStorage.getItem('discord_oauth_state');
    sessionStorage.removeItem('discord_oauth_state');
    if (!expectedState || state !== expectedState) {
      cleanUrl();
      error.value = 'member.error_state_mismatch';
      loading.value = false;
      return;
    }
    // 把 code 送給 server 換 token
    try {
      const bundle = await $fetch('/api/discord/token', {
        method: 'POST',
        body: { code }
      });
      saveTokens(bundle);
      cleanUrl();
    } catch (err) {
      console.error('[member] token exchange failed', err);
      cleanUrl();
      error.value = 'member.error_authorization_required';
      loading.value = false;
      return;
    }
  }

  await fetchAccountInfo(abortController.value.signal);
});

onUnmounted(() => {
  abortController.value?.abort();
});

// 清掉 URL 的 ?code=&state= (不要留在歷史紀錄)
const cleanUrl = () => {
  window.history.replaceState(null, '', window.location.pathname);
};

// === Fetch account / member info ===
// 內建 reactive refresh:第一次 401 就試 refresh 後 retry 一次,還失敗就放棄
const fetchAccountInfo = async signal => {
  loading.value = true;
  error.value = null;
  try {
    const token = await getValidAccessToken();
    if (!token) throw new Error('');

    const apiBase = config.public.DISCORD_API_BASE || 'https://discord.com/api';
    const guildId = '959421169629560892';

    // 包一個帶 retry 的 fetch:401 → refresh → 重打一次
    const callDiscord = async (path, retried = false) => {
      const accessToken = accessTokenCookie.value;
      const res = await fetch(`${apiBase}${path}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal
      });
      if (res.status === 401 && !retried) {
        // access token 在這幾毫秒間剛好失效 (or expires_at 算錯),試 refresh 再來一次
        const ok = await tryRefresh();
        if (ok) return callDiscord(path, true);
      }
      return res;
    };

    const accountRes = await callDiscord('/users/@me');
    if (accountRes.status === 401) throw new Error('member.error_authorization_required');
    else if (accountRes.status === 403) throw new Error('member.error_forbidden');
    else if (!accountRes.ok) throw new Error('member.error_get_member');
    account.value = await accountRes.json();

    const memberRes = await callDiscord(`/users/@me/guilds/${guildId}/member`);
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

// === Redirect 到 Discord 授權 ===
const redirectToDiscordAuth = () => {
  const clientId = config.public.DISCORD_CLIENT_ID;
  const redirectUri = config.public.DISCORD_REDIRECT_URI;

  // CSRF state:在 sessionStorage 存隨機字串,callback 時驗證
  const state = crypto.randomUUID();
  sessionStorage.setItem('discord_oauth_state', state);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code', // ← PR18: implicit 'token' → code grant 'code'
    scope: 'identify guilds guilds.members.read',
    state
  });

  window.location.href = `https://discord.com/oauth2/authorize?${params.toString()}`;
};

// === Logout: revoke + clear ===
const logout = async () => {
  // 通知 Discord 把 token 作廢 (失敗也沒關係,本地 cookie 反正要清)
  const accessToken = accessTokenCookie.value;
  if (accessToken) {
    try {
      await $fetch('/api/discord/revoke', {
        method: 'POST',
        body: { token: accessToken, token_type_hint: 'access_token' }
      });
    } catch {
      // ignore — revoke 失敗不擋 logout
    }
  }
  clearTokens();
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
  robots: 'noindex, nofollow'
});
</script>
