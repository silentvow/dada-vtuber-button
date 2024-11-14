<template>
  <v-layout column justify-center align-stretch app>
    <v-flex xs12 sm8 md6>
      <v-card class="mx-auto" outlined>
        <v-card-title class="headline mb-4">{{ $t('site.challenge') }}</v-card-title>

        <v-card-text class="d-flex flex-column align-center">
          <v-progress-circular indeterminate color="primary"></v-progress-circular>
          <p class="my-4 text--primary">{{ $t('member.loading') }}</p>
        </v-card-text>
      </v-card>
    </v-flex>

    <v-flex v-if="!!question" xs12 sm8 md6>
      <v-card>
        <v-card-text class="d-flex flex-column align-center">
          <iframe
            class="mx-5"
            :src="`https://www.youtube.com/embed/${question.url.slice(-11)}`"
            frameborder="0"
            allowfullscreen
            :style="{
              width: '100%',
              height: 'auto',
              maxWidth: '600px',
              aspectRatio: '16/9'
            }"
          ></iframe>
        </v-card-text>

        <v-card-text class="d-flex flex-column align-center">
          <v-radio-group class="mx-5" :style="{ width: '100%', maxWidth: '600px' }">
            <v-radio v-for="option in question?.options" :key="option.id" :value="option.id">
              <template v-slot:label>
                <div>
                  <voice-btn ref="voice_btn" :voice-id="option.id" @on-play="play(option)">
                    {{ option.name }}
                  </voice-btn>
                </div>
              </template>
            </v-radio>
          </v-radio-group>
          <v-btn class="mx-5 my-4" x-large color="success" @click="question = generateVoiceOptions()">
            {{ $t('site.next') }}
          </v-btn>
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
import voice_lists from '~/assets/voices.json';
import VoiceBtn from '../components/VoiceBtn';

export default {
  components: {
    VoiceBtn
  },
  data() {
    return {
      voices: voice_lists.groups.flatMap(group => group.voice_list),
      question: null,
      now_playing: new Set(),
      loading: true
    };
  },
  computed: {
    current_locale() {
      return this.$i18n.locale;
    },
    voice_host() {
      return '/voices/';
    }
  },
  mounted() {
    this.question = this.generateVoiceOptions();
    this.loading = false;
  },
  methods: {
    generateVoiceOptions() {
      // Flatten the voice list across all groups
      const voiceList = this.voices;

      // Randomly select a voice entry as the target
      const targetIndex = Math.floor(Math.random() * voiceList.length);
      const targetVoice = voiceList[targetIndex];

      // Filter out the target voice to pick non-matching options
      const remainingVoices = voiceList.filter(voice => voice.url !== targetVoice.url);

      // Shuffle and select three random non-matching voices
      const shuffledRemainingVoices = remainingVoices.sort(() => 0.5 - Math.random());
      const nonMatchingOptions = shuffledRemainingVoices.slice(0, 3);

      // Combine the target voice with the non-matching options and shuffle the result
      const voiceOptions = [targetVoice, ...nonMatchingOptions].sort(() => 0.5 - Math.random());

      // Return the result as an object
      return {
        url: targetVoice.url,
        options: voiceOptions.map(voice => ({
          id: voice.id,
          name: voice.name,
          description: voice.description,
          path: voice.path,
          correct: voice.url === targetVoice.url
        }))
      };
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
        smooth_end();
        clear_timer();
        this.now_playing.delete(audio);
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
  }
};
</script>
