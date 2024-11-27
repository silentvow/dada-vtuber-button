<template>
  <v-hover>
    <template v-slot="{ hover }">
      <v-item-group v-if="fromYoutube" rounded class="ma-1 vo-btn-group" :class="hover ? 'elevation-6' : 'elevation-2'">
        <v-btn
          :id="`button-${voiceId}`"
          :aria-label="`button-${voiceId}`"
          class="vo-btn pa-2"
          :class="[v_btn_classes]"
          color="primary"
          rounded
          :style="{
            '--hover-content': 'url(\'' + emoji_url + '\')',
            '--progress': progress + '%',
            '--start-percent': progress - 5 + '%'
          }"
          @click.native="onPlay"
        >
          <div style="z-index: 2">
            <slot class="slot"></slot>
          </div>
        </v-btn>

        <!-- Dropdown Action Button -->
        <v-menu offset-y left nudge-bottom="4">
          <template v-slot:activator="{ on, attrs }">
            <v-btn
              :id="`button-menu-${voiceId}`"
              :aria-label="`button-menu-${voiceId}`"
              v-bind="attrs"
              height="auto"
              color="primary"
              :style="{ opacity: 1 }"
              v-on="on"
            >
              <v-icon color="white">{{ icons.menu }}</v-icon>
            </v-btn>
          </template>
          <v-list dense>
            <v-list-item v-if="in_favorite" @click="onUnlike">
              <v-list-item-icon class="mr-2">
                <v-icon>{{ icons.heartMinus }}</v-icon>
              </v-list-item-icon>
              <v-list-item-content>
                <v-list-item-title>{{ $t('action.unlike') }}</v-list-item-title>
              </v-list-item-content>
            </v-list-item>
            <v-list-item v-else @click="onLike">
              <v-list-item-icon class="mr-2">
                <v-icon>{{ icons.heartPlus }}</v-icon>
              </v-list-item-icon>
              <v-list-item-content>
                <v-list-item-title>{{ $t('action.like') }}</v-list-item-title>
              </v-list-item-content>
            </v-list-item>
            <v-list-item @click="onYoutube">
              <v-list-item-icon class="mr-2">
                <v-icon>{{ icons.youtube }}</v-icon>
              </v-list-item-icon>
              <v-list-item-content>
                <v-list-item-title>{{ $t('action.view_stream') }}</v-list-item-title>
              </v-list-item-content>
            </v-list-item>
          </v-list>
        </v-menu>
      </v-item-group>
      <v-btn
        v-else
        :id="`button-${voiceId}`"
        :aria-label="`button-${voiceId}`"
        class="vo-btn full-width ma-1 pa-2"
        :class="[v_btn_classes]"
        color="primary"
        rounded
        :style="{
          borderRadius: '16px',
          '--hover-content': 'url(\'' + emoji_url + '\')',
          '--progress': progress + '%',
          '--start-percent': progress - 5 + '%'
        }"
        @click.native="onPlay"
      >
        <div style="z-index: 2">
          <slot class="slot"></slot>
        </div>
      </v-btn>
    </template>
  </v-hover>
</template>
<script>
import { mdiHeartMinus, mdiHeartPlus, mdiMenu, mdiYoutube } from '@mdi/js';
import twemoji from 'twemoji';

export default {
  name: 'VoiceBtn',
  props: {
    emoji: {
      default: '🦜',
      type: String
    },
    tbd: {
      default: false,
      type: Boolean
    },
    voiceId: {
      default: '#',
      type: String
    },
    fromYoutube: {
      default: false,
      type: Boolean
    },
    link: {
      default: false,
      type: Boolean
    }
  },
  data() {
    return {
      icons: {
        menu: mdiMenu,
        heartMinus: mdiHeartMinus,
        heartPlus: mdiHeartPlus,
        youtube: mdiYoutube
      },
      twe_para: {
        base: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets',
        folder: '/svg',
        ext: '.svg'
      },
      transition: '',
      width: '0',
      timer: null,
      progress: 0,
      playing: false
    };
  },
  computed: {
    in_favorite() {
      return this.$store.getters['getFavorite'].some(prefix => this.voiceId.startsWith(prefix));
    },
    v_btn_classes() {
      return {
        'grey--text text--lighten-2 vo-btn-bg-dark': this.link ? false : this.$vuetify.theme.dark,
        'vo-btn-bg-light': this.link ? false : !this.$vuetify.theme.dark,
        tbd: this.tbd,
        playing: this.playing
      };
    },
    emoji_url() {
      let reg = /<img[^>]+src="?([^"\s]+)"?\s*\/>/g;
      let str = twemoji.parse(this.emoji, this.twe_para);
      let match = reg.exec(str);
      return match[1];
    }
  },
  methods: {
    onPlay() {
      this.$emit('on-play');
    },
    onYoutube() {
      this.$emit('on-youtube');
    },
    onLike() {
      this.$store.commit('ADD_VOICE_FAVORITE', this.voiceId.slice(0, 13));
      this.$root.$emit('show-snackbar', this.$t('action.like_success'));
    },
    onUnlike() {
      this.$store.commit('REMOVE_VOICE_FAVORITE', this.voiceId.slice(0, 13));
      this.$root.$emit('show-snackbar', this.$t('action.unlike_success'));
    }
  }
};
</script>
<style lang="scss" scoped>
$nonlinear-transition: cubic-bezier(0.25, 0.8, 0.5, 1);

.vo-btn-group {
  display: inline-flex;
  align-items: stretch;
  border-radius: 16px;
}

.vo-btn-group > .v-btn.v-btn {
  border-radius: 0;
  border-style: solid;
  border-width: thin;
  box-shadow: none;
  padding: 0 12px;
}

.vo-btn-group .v-btn.v-btn.v-size--default {
  min-width: 48px;
  min-height: 0;
  height: unset;
}

.vo-btn-group > .v-btn.v-btn:first-child {
  border-top-left-radius: inherit;
  border-bottom-left-radius: inherit;
}

.vo-btn-group > .v-btn.v-btn:last-child {
  border-top-right-radius: inherit;
  border-bottom-right-radius: inherit;
}

.vo-btn-group > .v-btn.v-btn:not(:first-child) {
  border-left-width: 0;
}

.theme--light.vo-btn-group .v-btn.v-btn {
  border-color: rgba(0, 0, 0, 0.12) !important;
}

.theme--dark.vo-btn-group .v-btn.v-btn {
  border-color: rgba(255, 255, 255, 0.12) !important;
}

.theme--dark.v-menu__content {
  border: thin solid #757575;
}

.theme--light.v-menu__content {
  border: thin solid #e0e0e0;
}

.vo-btn.vo-btn {
  display: inline-block;
  height: max-content;
  min-height: 36px;
  max-width: calc(100% - 48px);
  word-wrap: break-word !important;
  word-break: break-all !important;
  white-space: normal !important;
  text-transform: none !important;
  font-weight: 400;
  text-align: center;
  z-index: 2;
}

.vo-btn.full-width {
  max-width: 100%;
}

.vo-btn-bg-light {
  background: linear-gradient(to right, #e57373 var(--start-percent), #c62828 var(--progress));
}

.vo-btn-bg-dark {
  background: linear-gradient(to right, #e57373 var(--start-percent), #c62828 var(--progress));
}

.vo-btn-bg-light.tbd {
  background: linear-gradient(to right, #8d6e63 var(--start-percent), #4e342e var(--progress));
}

.vo-btn-bg-dark.tbd {
  background: linear-gradient(to right, #8d6e63 var(--start-percent), #4e342e var(--progress));
}

.vo-btn div {
  display: inline-block;
  transition: 0.5s $nonlinear-transition;
  text-align: start;
  padding-left: 12px;
  padding-right: 12px;
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
  right: 0;
  text-align: center;
}

.btn-progress {
  position: absolute;
  top: -8px;
  left: -16px;
  width: 0;
  border-radius: 28px;
  min-height: 36px;
  height: 100%;
  //background: blue;
  transition: height 0.3s linear;
}

.playing div {
  animation: shake 3s linear infinite;
}

@keyframes shake {
  0% {
    transform: translateY(0px);
  }
  20% {
    transform: translateY(0px);
  }
  25% {
    transform: translateY(-4px);
  }
  30% {
    transform: translateY(0px);
  }
  35% {
    transform: translateY(-4px);
  }
  40% {
    transform: translateY(0px);
  }
  100% {
    transform: translateY(0px);
  }
}
</style>
