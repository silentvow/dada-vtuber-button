<template>
  <v-hover>
    <template #default="{ isHovering }">
      <v-btn-group
        v-if="fromYoutube"
        density="compact"
        rounded="xl"
        class="vo-btn-group"
        :class="isHovering ? 'elevation-6' : 'elevation-2'"
        v-bind="$attrs"
      >
        <v-btn
          :id="`button-${computedButtonId}`"
          :aria-label="slotText || computedButtonId"
          class="vo-btn pa-2"
          :class="v_btn_classes"
          color="primary"
          :style="{
            '--hover-content': 'url(\'' + emoji_url + '\')',
            '--progress': progress + '%',
            '--start-percent': progress - 5 + '%'
          }"
          @click="onPlay"
        >
          <div style="z-index: 2">
            <slot></slot>
          </div>
        </v-btn>

        <v-menu offset="4">
          <template #activator="{ props: menuProps }">
            <v-btn
              :id="`button-menu-${computedButtonId}`"
              :aria-label="$t('action.play_option')"
              v-bind="menuProps"
              height="auto"
              class="vo-menu-btn-bg"
              :class="{ liked: in_favorite }"
            >
              <v-icon icon="mdi-menu" color="white"></v-icon>
            </v-btn>
          </template>
          <v-list density="compact">
            <v-list-item
              v-if="in_favorite"
              prepend-icon="mdi-heart-minus"
              :title="$t('action.unlike')"
              @click="onUnlike"
            ></v-list-item>
            <v-list-item v-else prepend-icon="mdi-heart-plus" :title="$t('action.like')" @click="onLike"></v-list-item>
            <v-list-item prepend-icon="mdi-youtube" :title="$t('action.view_stream')" @click="onYoutube"></v-list-item>
            <v-list-item prepend-icon="mdi-download" :title="$t('action.download')" @click="onDownload"></v-list-item>
          </v-list>
        </v-menu>
      </v-btn-group>

      <v-btn
        v-else
        :id="`button-${computedButtonId}`"
        :aria-label="slotText || computedButtonId"
        class="vo-btn full-width px-2"
        :class="v_btn_classes"
        color="primary"
        rounded="xl"
        v-bind="$attrs"
        :style="{
          borderRadius: '16px',
          '--hover-content': 'url(\'' + emoji_url + '\')',
          '--progress': progress + '%',
          '--start-percent': progress - 5 + '%'
        }"
        @click="onPlay"
      >
        <div class="my-2 w-100 voice-btn-text" style="z-index: 2">
          <slot></slot>
        </div>
      </v-btn>
    </template>
  </v-hover>
</template>

<script setup>
import { computed, useSlots } from 'vue';
import { useTheme } from 'vuetify';
import twemoji from 'twemoji';

defineOptions({
  inheritAttrs: false
});

// 定義 Props
const props = defineProps({
  emoji: { type: String, default: '🦜' },
  tbd: { type: Boolean, default: false },
  voiceId: { type: String, default: '#' },
  buttonId: { type: String, default: '' },
  fromYoutube: { type: Boolean, default: false },
  link: { type: Boolean, default: false }
});

// 定義 Emits
const emit = defineEmits(['on-play', 'on-youtube', 'on-download']);

// 取得全域狀態與工具
const slots = useSlots();
const audioStore = useAudioStore();
const favoriteStore = useFavoriteStore();
const snackbar = useSnackbar();
const theme = useTheme();
const { t } = useI18n();

const progress = computed(() => audioStore.progressMap[props.voiceId] || 0);
const playing = computed(() => audioStore.playingMap[props.voiceId] || false);
const twe_para = {
  base: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets',
  folder: '/svg',
  ext: '.svg'
};

// 計算屬性
const computedButtonId = computed(() => props.buttonId || props.voiceId);

const slotText = computed(() => {
  const vnodes = slots.default?.() || [];
  return vnodes.join('').trim();
});

const in_favorite = computed(() => favoriteStore.isFavorite(props.voiceId));

const v_btn_classes = computed(() => {
  const isDark = theme.global.name.value === 'dark';
  return {
    'text-grey-lighten-2 vo-btn-bg-dark': props.link ? false : isDark,
    'vo-btn-bg-light': props.link ? false : !isDark,
    tbd: props.tbd,
    liked: in_favorite.value,
    playing: playing.value // 這裡未來可以綁定 audioStore 的 playingId 來自動觸發抖動動畫
  };
});

const emoji_url = computed(() => {
  const reg = /<img[^>]+src="?([^"\s]+)"?\s*\/>/g;
  const str = twemoji.parse(props.emoji, twe_para);
  const match = reg.exec(str);
  return match ? match[1] : '';
});

// 方法
const onPlay = event => {
  event.stopPropagation();
  emit('on-play');
};

const onYoutube = () => emit('on-youtube');
const onDownload = () => emit('on-download');

const onLike = () => {
  favoriteStore.addFavorite(props.voiceId);
  snackbar.show(t('action.like_success'));
};

const onUnlike = () => {
  favoriteStore.removeFavorite(props.voiceId);
  snackbar.show(t('action.unlike_success'));
};
</script>

<style lang="scss" scoped>
$nonlinear-transition: cubic-bezier(0.25, 0.8, 0.5, 1);

/* 替代 Tailwind 的 whitespace-normal */
.voice-btn-text {
  white-space: normal;
}

.vo-btn-group {
  height: max-content !important;
  background-color: transparent !important;
  border-color: transparent !important;
  display: inline-flex;
  align-items: stretch;
  border-radius: 16px;
}

.vo-btn-group > .v-btn {
  border-radius: 0;
  border-style: solid;
  border-width: thin;
  box-shadow: none;
  padding: 0 12px;
}

.vo-btn-group .v-btn.v-btn--size-default {
  min-width: 48px;
  min-height: 0;
  height: unset;
}

.vo-btn-group > .v-btn:first-child {
  border-top-left-radius: inherit;
  border-bottom-left-radius: inherit;
}

.vo-btn-group > .v-btn:last-child {
  border-top-right-radius: inherit;
  border-bottom-right-radius: inherit;
}

.vo-btn-group > .v-btn:not(:first-child) {
  border-left-width: 0;
}

.theme--light :deep(.vo-btn-group .v-btn) {
  border-color: rgba(0, 0, 0, 0.12) !important;
}

.theme--dark :deep(.vo-btn-group .v-btn) {
  border-color: rgba(255, 255, 255, 0.12) !important;
}

:deep(.vo-btn) {
  display: inline-block;
  height: max-content !important;
  min-height: 36px;
  max-width: calc(100% - 48px);
  z-index: 2;
}

:deep(.vo-btn .v-btn__content) {
  word-wrap: break-word !important;
  word-break: break-all !important;
  white-space: normal !important;
  text-transform: none !important;
  font-weight: 400;
  text-align: center;
}

.vo-btn.full-width {
  max-width: 100%;
}

.vo-btn-bg-light {
  background: linear-gradient(to right, #a29db3 var(--start-percent), #43404b var(--progress));
}

.vo-btn-bg-dark {
  background: linear-gradient(to right, #a29db3 var(--start-percent), #43404b var(--progress));
}

.vo-btn-bg-light.liked,
.vo-btn-bg-dark.liked {
  background: linear-gradient(to right, #e57373 var(--start-percent), rgb(var(--v-theme-primary)) var(--progress));
}

.vo-menu-btn-bg {
  color: #ffffff;
  background-color: #43404b;
  opacity: 1;
}

.vo-menu-btn-bg.liked {
  background-color: rgb(var(--v-theme-primary));
}

.vo-btn-bg-light.tbd,
.vo-btn-bg-dark.tbd {
  background: linear-gradient(to right, #8d6e63 var(--start-percent), #4e342e var(--progress));
}

.vo-btn div {
  color: #ffffff;
  display: inline-block;
  transition: 0.5s $nonlinear-transition;
  text-align: start;
  padding-left: 12px;
  padding-right: 12px;
  position: relative;
}

.vo-btn div:after {
  content: var(--hover-content);
  position: absolute;
  right: -10px;
  opacity: 0;
  transition: 0.5s $nonlinear-transition;
  width: 20px;
  height: 20px;
}

.vo-btn:hover div {
  padding-left: 0;
  padding-right: 24px;
}

.vo-btn:hover div:after {
  opacity: 1;
  right: 0px;
  text-align: center;
}

.playing div {
  animation: shake 3s linear infinite;
}

@keyframes shake {
  0%,
  20%,
  30%,
  40%,
  100% {
    transform: translateY(0px);
  }
  25%,
  35% {
    transform: translateY(-4px);
  }
}
</style>
