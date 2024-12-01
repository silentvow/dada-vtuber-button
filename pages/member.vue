<template>
  <v-layout column justify-center align-center app>
    <v-flex xs12 sm8 md6 style="min-width: 100%">
      <v-card class="mx-auto" outlined>
        <v-card-title class="headline mb-4">{{ $t('member.member_area') }}</v-card-title>

        <v-card-text v-if="loading" class="d-flex flex-column align-center">
          <v-progress-circular indeterminate color="primary"></v-progress-circular>
          <p class="my-4 text--primary">{{ $t('member.loading') }}</p>
        </v-card-text>

        <v-card-text v-else-if="error">
          <v-alert type="error" outlined>{{ error }}</v-alert>
          <v-btn
            v-if="account"
            large
            class="mt-4 px-8"
            color="success"
            :dark="$vuetify.theme.dark"
            @click="fetchAccountInfo"
          >
            {{ $t('member.refresh') }}
          </v-btn>
          <v-btn
            v-else
            large
            class="mt-4 px-8"
            color="success"
            :dark="$vuetify.theme.dark"
            @click="redirectToDiscordAuth"
          >
            {{ $t('member.link_discord') }}
          </v-btn>
        </v-card-text>

        <v-card-text v-else>
          <h2 class="text-h6 mb-2 text--primary">{{ $t('member.welcome') }}, {{ account?.global_name }}</h2>

          <div v-if="isAuthorized">
            <v-alert :dark="$vuetify.theme.dark" type="success" outlined>
              {{ $t('member.member_authorized') }}
            </v-alert>
          </div>
          <div v-else>
            <v-alert :dark="$vuetify.theme.dark" type="error" outlined>
              {{ $t('member.member_unauthorized') }}
            </v-alert>
          </div>

          <div class="d-flex">
            <v-btn
              v-if="!isAuthorized"
              color="success"
              large
              class="mt-4 mr-4 px-8"
              :dark="$vuetify.theme.dark"
              @click="fetchAccountInfo"
            >
              {{ $t('member.refresh') }}
            </v-btn>
            <v-btn color="error" large class="mt-4 px-8" :dark="$vuetify.theme.dark" @click="logout">
              {{ $t('member.unlink') }}
            </v-btn>
          </div>
        </v-card-text>
      </v-card>
    </v-flex>

    <v-flex v-if="isAuthorized" xs12 sm8 md6 style="min-width: 100%">
      <!-- 对每个按钮组生成一个Card -->
      <v-card v-for="group in groups" :key="group.name">
        <v-card-title class="headline text--primary">
          {{ group.group_description[current_locale] }}
        </v-card-title>
        <v-card-text class="button-container">
          <voice-btn
            v-for="item in group.voice_list"
            ref="voice_btn"
            :key="item.id"
            :tbd="item.TBD"
            :from-youtube="false"
            @on-play="play(item)"
          >
            {{ item.description[current_locale] || item.description['zh'] }}
          </voice-btn>
        </v-card-text>
      </v-card>
    </v-flex>
  </v-layout>
</template>

<style lang="scss" scoped>
.v-card {
  margin: 8px auto;
}
</style>
<script>
import voice_lists from '~/assets/dc_voices.json';
import VoiceBtn from '../components/VoiceBtn';

export default {
  components: {
    VoiceBtn
  },
  data() {
    return {
      groups: voice_lists.groups,
      now_playing: new Set(),
      loading: true,
      error: null,
      account: null,
      member: null
    };
  },
  computed: {
    current_locale() {
      return this.$i18n.locale;
    },
    voice_host() {
      if (process.env.NODE_ENV === 'production')
        return 'https://cdn.jsdelivr.net/gh/silentvow/dada-vtuber-button@master/static/voices/';
      else return '/voices/';
    },
    isAuthorized() {
      return this.member?.roles.length > 0;
    }
  },
  mounted() {
    setTimeout(() => this.fetchAccountInfo(), 1000);
  },
  beforeMount() {
    const hash = window.location.hash;
    if (hash && hash.includes('access_token')) {
      const params = new URLSearchParams(hash.substring(1));
      const token = params.get('access_token');
      if (token) {
        this.$cookies.set('discord_token', token);
        window.location.hash = ''; // Clean up the URL
      }
    }
  },
  methods: {
    async fetchAccountInfo() {
      this.loading = true;
      this.error = null;
      try {
        const token = this.$cookies.get('discord_token');
        if (!token) throw new Error('');

        const headers = { Authorization: `Bearer ${token}` };

        const accountRes = await fetch(`${this.$config.DISCORD_API_BASE}/users/@me`, { headers });
        if (accountRes.status === 401) {
          throw new Error('Authorization required');
        } else if (accountRes.status === 403) {
          throw new Error('Forbidden');
        } else if (!accountRes.ok) {
          throw new Error('Failed to fetch account info');
        }
        this.account = await accountRes.json();

        const memberRes = await fetch(`${this.$config.DISCORD_API_BASE}/users/@me/guilds/959421169629560892/member`, {
          headers
        });
        if (!memberRes.ok) {
          throw new Error('Failed to fetch member info');
        }
        this.member = await memberRes.json();

        this.loading = false;
      } catch (err) {
        this.error = err.message || 'Authorization required';
        this.loading = false;
      }
    },
    redirectToDiscordAuth() {
      const discordAuthUrl = `https://discord.com/oauth2/authorize?client_id=${
        this.$config.DISCORD_CLIENT_ID
      }&redirect_uri=${encodeURIComponent(
        this.$config.DISCORD_REDIRECT_URI
      )}&response_type=token&scope=identify%20guilds%20guilds.members.read`;
      window.location.href = discordAuthUrl;
    },
    logout() {
      this.$cookies.remove('discord_token');
      this.account = null;
      this.member = null;
      this.error = 'Logged out. Please re-authenticate.';
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
    play(item) {
      //播放音频主逻辑部分
      let ref = null;
      let timer = null;
      this.$refs.voice_btn.forEach(i => {
        if (i.$vnode.data.key === item.name) {
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
        let play_end_timer = setInterval(() => {
          ref.progress -= 5;
          if (ref.progress <= 0) {
            clearInterval(play_end_timer);
            play_end_timer = null;
          }
        }, 50);
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
    }
  },
  head() {
    return {
      title: this.$t('member.member_area') + ' - ' + this.$t('site.title')
    };
  }
};
</script>
