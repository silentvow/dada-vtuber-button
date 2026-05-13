<template>
  <v-app>
    <v-navigation-drawer v-model="drawer" :mobile-breakpoint="1024" class="elevation-3" tag="nav">
      <v-list style="padding-top: 0" role="none">
        <v-list-item :to="localePath('/')" exact>
          <template #prepend>
            <v-img alt="home-icon" src="/icon.png" width="24" class="mr-8" />
          </template>
          <v-list-item-title>{{ $t('site.index') }}</v-list-item-title>
        </v-list-item>

        <v-list-item
          :to="localePath('/favorite')"
          exact
          :prepend-icon="mdiHeartOutline"
          :title="$t('site.favorite')"
        ></v-list-item>
        <v-list-item
          :to="localePath('/challenge')"
          exact
          :prepend-icon="mdiHeadQuestionOutline"
          :title="$t('site.challenge')"
        ></v-list-item>
        <v-list-item
          :to="localePath('/feedback')"
          exact
          :prepend-icon="mdiMessageAlertOutline"
          :title="$t('site.feedback')"
        ></v-list-item>
        <v-list-item
          :to="localePath('/member')"
          exact
          :prepend-icon="mdiAccountGroup"
          :title="$t('member.member_area')"
        ></v-list-item>
      </v-list>
      <v-divider></v-divider>

      <v-list role="none">
        <v-list-item
          v-for="(item, i) in navigatorItems"
          :key="i"
          :href="item.to"
          target="_blank"
          rel="noreferrer"
          exact
        >
          <template #prepend>
            <v-img :alt="item.title" :src="item.icon" width="24" class="mr-8" />
          </template>
          <v-list-item-title>{{ item.title }}</v-list-item-title>
        </v-list-item>
      </v-list>

      <template #append>
        <NuxtImg
          src="/img/woman.png"
          alt="灰妲側欄圖"
          width="256"
          format="webp"
          quality="80"
          loading="lazy"
          sizes="256px"
          style="width: 100%; height: auto"
        />
      </template>
    </v-navigation-drawer>

    <v-app-bar class="text-white" color="primary" density="compact">
      <v-app-bar-nav-icon
        variant="text"
        :aria-label="$t('site.switch_menu')"
        @click.stop="drawer = !drawer"
      ></v-app-bar-nav-icon>
      <v-toolbar-title>{{ $t('site.title') }}</v-toolbar-title>
      <v-spacer></v-spacer>

      <v-menu :close-on-content-click="false">
        <template #activator="{ props }">
          <v-btn icon variant="plain" :aria-label="$t('control.volume')" v-bind="props">
            <v-icon :icon="mdiVolumeHigh"></v-icon>
          </v-btn>
        </template>
        <v-sheet class="pa-2 align-center" width="256" style="display: flex">
          <v-icon :icon="mdiVolumeLow" color="primary" class="mr-2"></v-icon>
          <v-slider
            v-model="volume"
            :min="0"
            :max="100"
            hide-details
            track-color="#bdbdbd"
            color="#ff8a80"
            :aria-label="$t('control.volume')"
            @update:model-value="onVolumeChange"
          ></v-slider>
          <v-icon :icon="mdiVolumeHigh" color="primary" class="ml-2"></v-icon>
        </v-sheet>
      </v-menu>

      <v-tooltip location="bottom" :text="$t('site.switch_dark_mode')" :aria-label="$t('site.switch_dark_mode')">
        <template #activator="{ props }">
          <v-btn icon variant="plain" :aria-label="$t('site.switch_dark_mode')" v-bind="props" @click="toggleTheme">
            <v-icon :icon="mdiBrightness2"></v-icon>
          </v-btn>
        </template>
      </v-tooltip>

      <v-menu>
        <template #activator="{ props: menuProps }">
          <v-tooltip location="bottom" :text="$t('site.switch_language')" :aria-label="$t('site.switch_language')">
            <template #activator="{ props: tooltipProps }">
              <v-btn
                icon
                variant="plain"
                :aria-label="$t('site.switch_language')"
                v-bind="mergeProps(menuProps, tooltipProps)"
              >
                <v-icon :icon="mdiTranslate"></v-icon>
              </v-btn>
            </template>
          </v-tooltip>
        </template>
        <v-list>
          <v-list-item @click="switchLang('zh')"><v-list-item-title>中文</v-list-item-title></v-list-item>
          <v-list-item @click="switchLang('ja')"><v-list-item-title>日本語</v-list-item-title></v-list-item>
          <v-list-item @click="switchLang('en')"><v-list-item-title>English</v-list-item-title></v-list-item>
        </v-list>
      </v-menu>
    </v-app-bar>

    <v-main>
      <v-container class="page">
        <NuxtImg
          class="rounded mb-4 d-block banner-hero"
          src="/banner.jpg"
          alt="灰妲語音博物館橫幅"
          width="1920"
          height="480"
          sizes="100vw md:1024px lg:1280px xl:1920px"
          format="webp"
          quality="80"
          loading="eager"
          fetchpriority="high"
        />

        <slot />

        <v-snackbar v-model="snackbar.isVisible.value" :timeout="2000" elevation="6" location="top" color="success">
          {{ snackbar.message.value }}
        </v-snackbar>
      </v-container>

      <v-footer class="footer d-flex flex-column align-middle" style="align-items: flex-start">
        <div class="text-center">
          <span>&copy; {{ new Date().getFullYear() }}&nbsp;</span>
          <!-- text-accent (#ff8a80) 不論 footer bg (#212121) 或 app fallback bg (#43404b) 都過 WCAG AA -->
          <a
            :href="$t('site.footer.author_link')"
            target="_blank"
            rel="noreferrer"
            class="text-decoration-underline text-accent"
            >{{ $t('site.footer.author') }}</a
          >
          <span>&nbsp;|&nbsp;</span>
          <NuxtLink :to="localePath('/privacy')" class="text-decoration-underline text-accent">{{
            $t('site.privacy')
          }}</NuxtLink>
        </div>
        <div class="text-center mt-1" v-html="footerContent"></div>
      </v-footer>
    </v-main>
  </v-app>
</template>

<script setup>
import { ref, computed, onMounted, watch, mergeProps } from 'vue';
import { useTheme } from 'vuetify';
import {
  mdiHeartOutline,
  mdiHeadQuestionOutline,
  mdiMessageAlertOutline,
  mdiAccountGroup,
  mdiVolumeHigh,
  mdiVolumeLow,
  mdiBrightness2,
  mdiTranslate
} from '@mdi/js';
import { useSettingsStore } from '~/stores/settings';
import { useSnackbar } from '~/composables/useSnackbar';
import navigatorItems from '~~/assets/navigator.json';

const settings = useSettingsStore();
const snackbar = useSnackbar();
const theme = useTheme();
const { t, setLocale } = useI18n();
const localePath = useLocalePath();

// drawer 初始 false (SSG 友善,所有 client 一致);桌面在 onMounted 才打開
// 桌面 v-main 的 256px 空間由 critical CSS @media 預留,所以 onMounted 開 drawer 不會造成 CLS
const drawer = ref(false);
const volume = ref(settings.volume);

const footerContent = computed(() => {
  // text-accent 對 footer 兩種可能背景 (CSS 載入後 #212121 / 未載入 fallback #43404b) 都過 AA
  const styledName = `<a href="${localePath('/feedback')}" class="text-decoration-underline text-accent">${t('site.feedback')}</a>`;
  return t('site.footer.content').replace('{feedback}', styledName);
});

watch(
  () => settings.dark,
  isDark => {
    const themeName = isDark ? 'dark' : 'light';
    if (typeof theme.change === 'function') {
      theme.change(themeName); // 使用模組提供的新方法
    } else {
      theme.global.name.value = themeName; // 備用方案
    }
  },
  { immediate: true }
);

onMounted(() => {
  const updateVh = () => {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  };
  updateVh();
  window.addEventListener('resize', updateVh);

  // 桌面打開 drawer (256px 空間已由 critical CSS @media 預留,不會觸發 CLS)
  if (window.innerWidth >= 1024) {
    drawer.value = true;
  }

  // 注意:不在 onMounted 主動 setLocale(settings.lang)
  // URL prefix 是語系的真實來源,主動切換會導致 Google 索引 /ja 的訪客被踢回 /
});

const toggleTheme = () => {
  settings.setDark(!settings.dark);
};

const switchLang = lang => {
  settings.setLang(lang);
  setLocale(lang);
};

const onVolumeChange = val => {
  settings.setVolume(val);
};
</script>

<style lang="scss">
:root {
  --vh: 1vh;
}
.v-application--wrap {
  min-height: calc(var(--vh, 1vh) * 100) !important;
}
.page {
  box-sizing: border-box;
  min-height: calc(100vh - 48px - 68px); // 減去 app-bar 和 footer 的高度
}
.footer {
  width: 100%;
}

.v-theme--light.v-application {
  background-color: #a29db3;
}
.v-theme--dark.v-application {
  background-color: #43404b;
}

/* Banner hero:桌面保持原 4:1 寬幅,行動裝置改 16:9 比例 (~211px on 375px viewport)
   讓 mobile 也能看清楚角色,跟 desktop 視覺份量接近 */
.banner-hero {
  width: 100%;
  max-height: 360px;
  object-fit: cover;
  object-position: center;
}
@media (max-width: 768px) {
  .banner-hero {
    aspect-ratio: 16 / 9;
    max-height: none;
  }
}
</style>
