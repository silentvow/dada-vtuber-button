<template>
  <v-layout column justify-center align-center app>
    <!-- 播放控制的浮动按钮 -->
    <v-speed-dial
      v-model="fab"
      fixed
      bottom
      right
      direction="top"
      open-on-click
      transition="slide-y-reverse-transition"
    >
      <template v-slot:activator>
        <v-btn
          id="button-player"
          slot="activator"
          v-model="fab"
          aria-label=""
          player
          button
          :class="speed_dial_color"
          dark
          fab
          hover
        >
          <v-icon v-if="fab">
            {{ icons.close }}
          </v-icon>
          <v-icon v-else large>
            {{ icons.play }}
          </v-icon>
        </v-btn>
      </template>
      <v-btn fab small :class="fab_color" @click.stop="stop_all()">
        <span class="fab-tip">{{ $t('control.stop') }}</span>
        <v-icon :class="fab_icon">
          {{ icons.stop }}
        </v-icon>
      </v-btn>
      <v-btn fab small :class="fab_color" @click.stop="play_random_voice()">
        <span class="fab-tip">{{ $t('control.pick_one') }}</span>
        <v-icon :class="fab_icon">
          {{ icons.selection_ellipse_arrow_inside }}
        </v-icon>
      </v-btn>
      <v-btn fab small :class="fab_color" :disabled="random" @click.stop="overlap = !overlap">
        <span class="fab-tip">
          {{ overlap_text }}
        </span>
        <v-icon :class="fab_icon">
          {{ icons.view_parallel }}
        </v-icon>
      </v-btn>
      <v-btn fab small :class="fab_color" :disabled="random" @click.stop="repeat = !repeat">
        <span class="fab-tip">
          {{ repeat_text }}
        </span>
        <v-icon :class="fab_icon">
          {{ icons.repeat }}
        </v-icon>
      </v-btn>
      <v-btn fab small :class="fab_color" :disabled="overlap || repeat" @click.stop="random = !random">
        <span class="fab-tip">
          {{ random_text }}
        </span>
        <v-icon :class="fab_icon">
          {{ icons.shuffle }}
        </v-icon>
      </v-btn>
    </v-speed-dial>
    <v-flex xs12 sm8 md6 style="min-width: 85%">
      <v-expansion-panels v-model="panel" class="my-3" multiple>
        <v-expansion-panel v-for="group in groups" :id="`panel-${group.id}`" :key="group.name">
          <v-expansion-panel-header class="headline font-weight-bold" :class="dark_text">
            {{ group.group_description[current_locale] }}
            <v-chip x-small class="mx-3 flex-grow-0" color="info" outlined>{{ group.voice_list.length }}</v-chip>
            <v-btn class="flex-grow-0" icon depressed plain @click.stop="copyLink(group.id)">
              <v-icon>{{ icons.link }}</v-icon>
            </v-btn>
          </v-expansion-panel-header>
          <v-expansion-panel-content class="button-panel">
            <voice-btn
              v-for="item in group.voice_list"
              ref="voice_btn"
              :key="item.id"
              :voice-id="item.id"
              :class="voice_button_color"
              :from-youtube="Boolean(item.url)"
              @on-play="play(item)"
              @on-youtube="openModal(item)"
              @on-download="download(item)"
            >
              {{ item.description[current_locale] || item.description['zh'] }}
            </voice-btn>
          </v-expansion-panel-content>
        </v-expansion-panel>
      </v-expansion-panels>
    </v-flex>
    <!-- <v-flex xs12 sm8 md6 style="min-width: 85%">
      <v-card v-for="(group, groupIndex) in groups" :key="group.name">
        <v-card-title class="headline font-weight-bold d-flex align-center" :class="dark_text">
          {{ group.group_description[current_locale] }}
          <v-chip x-small class="mx-3" color="info" outlined>{{ group.voice_list.length }}</v-chip>
        </v-card-title>
        <v-card-text class="button-container">
          <voice-btn
            v-for="item in opened_group_set.has(group.id) ? group.voice_list : reduced_groups[groupIndex].voice_list"
            ref="voice_btn"
            :key="item.id"
            :voice-id="item.id"
            :class="voice_button_color"
            :from-youtube="Boolean(item.url)"
            @on-play="play(item)"
            @on-youtube="openModal(item)"
          >
            {{ item.description[current_locale] || item.description['zh'] }}
          </voice-btn>
        </v-card-text>
      </v-card>
    </v-flex> -->

    <v-dialog v-model="is_dialog_open" max-width="600px">
      <v-card>
        <v-card-title>
          {{ `${$t('site.voice')}：${dialog_item.description[current_locale]}` }}
        </v-card-title>
        <v-card-text>
          <span>{{ $t('site.source') }}：</span>
          <a :href="dialog_item.url" target="_blank" rel="noreferrer">{{ dialog_item.url }}</a>
        </v-card-text>
        <iframe
          class="mx-5"
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
          <v-btn class="ml-auto mr-0 px-16" color="primary" large @click.native="is_dialog_open = false">
            {{ $t('control.disabled') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-layout>
</template>

<style lang="scss" scoped>
$nonlinear-transition: cubic-bezier(0.25, 0.8, 0.5, 1);
.group-tabs {
  margin-top: 16px;
  border-radius: 4px;
  box-shadow: 0px 3px 1px -2px rgba(0, 0, 0, 0.2), 0px 2px 2px 0px rgba(0, 0, 0, 0.14),
    0px 1px 5px 0px rgba(0, 0, 0, 0.12);
}

.group-tab-items {
  background: transparent;
}

.v-card {
  margin: 8px auto;
}

.justify-self-end {
  margin-left: auto;
  justify-self: flex-end;
}

.fab-tip {
  position: absolute;
  right: 52px;
  padding: 5px 16px;
  background: rgba(97, 97, 97, 0.9);
  border-radius: 4px;
  color: #fff;
  width: auto;
  font-size: 14px;
  font-weight: normal;
  line-height: 22px;
  opacity: 0.9;
  text-transform: none;
  letter-spacing: normal;
}

.notification-board {
  white-space: pre-line;
  height: auto;
  display: flex;
}
.notification-board ::v-deep p {
  margin-bottom: 0;
}
</style>

<script>
import voice_lists from '~/assets/voices.json';
import VoiceBtn from '../components/VoiceBtn';
// import SkeletonLoading from '../components/SkeletonLoading';

import {
  mdiClockOutline,
  mdiClose,
  mdiLink,
  mdiPlay,
  mdiRepeat,
  mdiSelectionEllipseArrowInside,
  mdiShuffle,
  mdiStop,
  mdiViewParallel
} from '@mdi/js';

export default {
  components: {
    VoiceBtn
    //SkeletonLoading
  },
  data() {
    return {
      icons: {
        close: mdiClose,
        link: mdiLink,
        play: mdiPlay,
        stop: mdiStop,
        selection_ellipse_arrow_inside: mdiSelectionEllipseArrowInside,
        view_parallel: mdiViewParallel,
        repeat: mdiRepeat,
        shuffle: mdiShuffle,
        clock_outline: mdiClockOutline
      },
      overlap: false,
      random: false,
      repeat: false,
      fab: false,
      group_type: 0,
      groups: voice_lists.groups,
      panel: [0],
      now_playing: new Set(),
      upcoming_lives: [],
      lives: [],
      lives_loading: true,
      is_dialog_open: false,
      dialog_item: { description: {}, url: '' }
    };
  },
  computed: {
    voice_host() {
      if (process.env.NODE_ENV === 'production')
        return 'https://cdn.jsdelivr.net/gh/silentvow/dada-vtuber-button@master/static/voices/';
      else return '/voices/';
    },
    dark_text() {
      return {
        'grey--text text--lighten-2': this.$vuetify.theme.dark
      };
    },
    voice_button_color() {
      return {
        primary: this.$vuetify.theme.dark,
        'primary white--text': !this.$vuetify.theme.dark
      };
    },
    fab_icon() {
      return [this.$vuetify.theme.dark ? 'white--text' : 'blue-grey--text text--darken-1'];
    },
    fab_color() {
      return [this.$vuetify.theme.dark ? 'blue-grey darken-1' : 'white'];
    },
    speed_dial_color: function () {
      return [this.$vuetify.theme.dark ? 'blue-grey darken-1' : 'blue-grey darken-1'];
    },
    current_locale() {
      return this.$i18n.locale;
    },
    overlap_text() {
      return (
        this.$t('control.overlap') + ' ' + (this.overlap ? this.$t('control.enabled') : this.$t('control.disabled'))
      );
    },
    random_text() {
      return this.$t('control.random') + ' ' + (this.random ? this.$t('control.enabled') : this.$t('control.disabled'));
    },
    repeat_text() {
      return this.$t('control.repeat') + ' ' + (this.repeat ? this.$t('control.enabled') : this.$t('control.disabled'));
    }
  },
  watch: {
    is_dialog_open(newValue) {
      if (!newValue) {
        this.dialog_item = { description: {}, url: '' };
      }
    }
  },
  async mounted() {
    this.$vuetify.theme.dark = this.$store.state.dark === 'true';

    // Jump to the group if the hash is set
    const hash = window.location.hash.replace('#', '');
    if (hash) {
      const groupIndex = this.groups.findIndex(group => group.id === hash);
      if (groupIndex !== -1) {
        this.$nextTick(() => {
          const interval = setInterval(() => {
            const el = document.getElementById(`panel-${hash}`);
            if (el) {
              clearInterval(interval);
              this.panel = [groupIndex];
              const y = el.getBoundingClientRect().top + window.scrollY - 64;
              window.scrollTo({ top: y });
            }
          }, 100);
        });
      }
    }

    await this.fetch_live_data();
    // Media Session Metadata
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        this.play_random_voice();
      });
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        this.play_random_voice();
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        this.stop_all();
        navigator.mediaSession.playbackState = 'paused';
      });
    }
  },
  methods: {
    async fetch_live_data() {
      //TODO: 获取B站动态或者直播信息
      //TODO：可选主要的平台，例如YouTube和Bilibili
      return null;
    },
    format_time(stamp) {
      return require('dayjs')(stamp).format('YYYY/M/DD HH:mm');
    },
    send_google_event(item) {
      if (process.client && process.env.NODE_ENV === 'production') {
        // eslint-disable-next-line no-undef
        ga('send', {
          hitType: 'event',
          eventCategory: 'Audios',
          eventAction: 'play',
          eventLabel: item.name + ' ' + item.description['zh']
        });
      }
    },
    download(item) {
      let a = document.createElement('a');
      a.target = '_blank';
      a.href = this.voice_host + item.path;
      a.download = item.path.split('/').pop();
      a.click();
    },
    copyLink(groupId) {
      const url = window.location.host + '/#' + groupId;
      navigator.clipboard.writeText(url).then(() => {
        this.$root.$emit('show-snackbar', this.$t('action.copy_link'));
      });
    },
    openModal(item) {
      this.is_dialog_open = true;
      this.dialog_item = item;
    },
    play(item) {
      //播放音频主逻辑部分
      let ref = null;
      let timer = null;
      this.$refs.voice_btn.forEach(i => {
        if (i.$vnode.data.key === item.id) {
          ref = i;
        }
      });
      if (!this.overlap) {
        this.now_playing.forEach(i => {
          i.pause();
          this.now_playing.delete(i);
          console.log(item.name, 'paused before new playing');
        });
      }
      let setup_timer = () => {
        if (timer !== null) clear_timer();
        timer = setInterval(() => {
          let prog = Number(((audio.currentTime / audio.duration) * 100).toFixed(2));
          if (prog !== Infinity && !isNaN(prog)) {
            ref.progress = prog;
          } else {
            ref.progress = 0;
          }
        }, 50);
      };
      let smooth_end = () => {
        // let play_end_timer = setInterval(() => {
        //   ref.progress -= 5;
        //   if (ref.progress <= 0) {
        //     clearInterval(play_end_timer);
        //     play_end_timer = null;
        //   }
        // }, 50);
        ref.progress = 0;
        ref.playing = false;
      };
      let clear_timer = () => {
        clearInterval(timer);
        timer = null;
      };
      let audio = new Audio(this.voice_host + item.path);
      audio.load(); //This could fix iOS playing bug
      if ('mediaSession' in navigator) {
        const metadata = {
          title: this.overlap ? this.$t('control.overlap_title') : item.description[this.current_locale],
          artist: this.$t('control.full_name'),
          album: this.$t('site.title'),
          artwork: [{ src: '/img/media-cover.png', sizes: '128x128', type: 'image/png' }]
        };
        navigator.mediaSession.metadata = new window.MediaMetadata(metadata);
        navigator.mediaSession.playbackState = 'playing';
      }
      audio.addEventListener('canplay', () => {
        audio.volume = this.$store.state.volume * 0.01;
        audio.play();
        this.now_playing.add(audio);
        this.send_google_event(item);
        ref.playing = true;
        setup_timer();
      });
      audio.addEventListener('ended', () => {
        if (this.repeat) {
          audio.play();
          this.now_playing.add(audio);
          this.send_google_event(item);
          ref.playing = true;
          setup_timer();
        } else if (this.random) {
          this.play_random_voice();
        } else {
          smooth_end();
          clear_timer();
          this.now_playing.delete(audio);
        }
      });
      audio.addEventListener('pause', () => {
        // console.log(item.name, 'paused');
        smooth_end();
        //if (!this.repeat) {
        clear_timer();
        this.now_playing.delete(audio);
        //}
        if ('mediaSession' in navigator) {
          navigator.mediaSession.playbackState = 'paused';
        }
      });
      this.$bus.$on('abort_play', () => {
        audio.pause();
        smooth_end();
        clear_timer();
        this.now_playing.delete(audio);
        delete this.audio;
      });
    },
    get_random_int(max) {
      return Math.floor(Math.random() * Math.floor(max));
    },
    play_random_voice() {
      let random_list = this.groups[this.get_random_int(this.groups.length)];
      this.play(random_list.voice_list[this.get_random_int(random_list.voice_list.length)]);
    },
    stop_all() {
      console.log('stop-all');
      this.$bus.$emit('abort_play');
    }
  },
  head() {
    return {
      title: this.$t('site.title')
    };
  }
};
</script>
