<template>
  <v-layout column justify-center align-stretch app>
    <v-flex xs12 sm8 md6>
      <v-card class="mx-auto">
        <v-card-title class="headline">{{ $t('site.challenge') }}</v-card-title>
        <v-card-subtitle class="subtitle-1">{{ $t('challenge.rule') }}</v-card-subtitle>

        <v-card-text class="d-flex flex-row align-center">
          <v-card :elevation="0" class="mr-2 score_card">
            <v-card-text class="text-h5 text-center pb-0">{{ $t('challenge.now_score') }}</v-card-text>
            <v-card-text class="text-h3 text-center pt-0 font-weight-bold">{{ score }}</v-card-text>
          </v-card>
          <v-card :elevation="0" class="ml-2 score_card">
            <v-card-text class="text-h5 text-center pb-0">{{ $t('challenge.high_score') }}</v-card-text>
            <v-card-text class="text-h3 text-center pt-0 font-weight-bold">{{ high_score }}</v-card-text>
          </v-card>
        </v-card-text>
      </v-card>
    </v-flex>

    <v-flex v-if="!!question" xs12 sm8 md6>
      <v-card>
        <v-card-title class="headline">{{ $t('challenge.question_desc') }}</v-card-title>
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
          <v-radio-group v-model="picked_answer" class="mx-5">
            <v-radio v-for="(option, index) in question?.options" :key="option.id" :value="option.id">
              <template v-slot:label>
                <div>
                  <voice-btn
                    ref="voice_btn"
                    :key="option.id"
                    :voice-id="option.id"
                    :style="{ width: '256px' }"
                    @on-play="play(option)"
                  >
                    {{ $t('action.play_option') }} {{ index + 1 }}
                  </voice-btn>
                </div>
              </template>
            </v-radio>
          </v-radio-group>
        </v-card-text>

        <v-card-text class="d-flex flex-column align-center">
          <v-btn
            class="mx-5 mb-4"
            x-large
            color="success"
            :disabled="!picked_answer"
            :style="{ minWidth: '284px' }"
            @click="submitAnswer"
          >
            {{ $t('action.submit_answer') }}
          </v-btn>
        </v-card-text>
      </v-card>

      <v-dialog v-model="show_correct_answer" max-width="600">
        <v-card>
          <v-toolbar color="primary" dark> {{ $t('challenge.answer_result') }} {{ answer_index }} </v-toolbar>
          <v-card-text class="justify-center">
            <div class="text-h2 text-center pt-8">{{ $t('challenge.correct') }}</div>
          </v-card-text>
          <v-card-actions class="justify-end">
            <v-btn text @click="show_correct_answer = false">
              {{ $t('challenge.next_question') }}
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
      <v-dialog v-model="show_wrong_answer" max-width="600">
        <v-card>
          <v-toolbar color="primary" dark> {{ $t('challenge.answer_result') }} {{ answer_index }} </v-toolbar>
          <v-card-text class="justify-center pt-8">
            <div class="text-h2 text-center">{{ $t('challenge.wrong') }}</div>
          </v-card-text>
          <v-card-actions class="justify-end">
            <v-btn text @click="show_wrong_answer = false">
              {{ $t('challenge.next_question') }}
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </v-flex>
  </v-layout>
</template>

<style lang="scss" scoped>
.v-card {
  margin: 8px auto;
}
.score_card {
  width: 160px;
  border: thick solid #424242;
}
.score_card.theme--dark {
  border: thick solid #eeeeee;
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
      score: 0,
      high_score: Number(localStorage.getItem('da_game_high_score') || 0),
      now_playing: new Set(),
      loading: true,
      picked_answer: '',
      show_correct_answer: false,
      show_wrong_answer: false
    };
  },
  computed: {
    answer_index() {
      return this.question?.options.findIndex(option => option.correct) + 1;
    },
    current_locale() {
      return this.$i18n.locale;
    },
    voice_host() {
      if (process.env.NODE_ENV === 'production')
        return 'https://cdn.jsdelivr.net/gh/silentvow/dada-vtuber-button@master/static/voices/';
      else return '/voices/';
    }
  },
  watch: {
    show_correct_answer(value) {
      if (value) return;
      this.score++;
      this.generateNextQuestion();
    },
    show_wrong_answer(value) {
      if (value) return;
      if (this.score > this.high_score) {
        this.high_score = this.score;
        localStorage.setItem('da_game_high_score', this.high_score);
      }
      this.score = 0;
      this.generateNextQuestion();
    }
  },
  mounted() {
    this.question = this.generateVoiceOptions();
    this.loading = false;
  },
  methods: {
    submitAnswer() {
      this.stop_all();
      const option = this.question.options.find(option => option.id === this.picked_answer);
      if (option.correct) {
        this.show_correct_answer = true;
      } else {
        this.show_wrong_answer = true;
      }
    },
    generateNextQuestion() {
      for (;;) {
        let q = this.generateVoiceOptions();
        if (q.url !== this.question?.url) {
          this.question = q;
          break;
        }
      }
    },
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
        if (i.$vnode.data.key === item.id) {
          ref = i;
        }
      });
      if (!this.overlap) {
        this.now_playing.forEach(i => {
          i.pause();
          this.now_playing.delete(i);
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
    },
    stop_all() {
      this.$bus.$emit('abort_play');
    }
  }
};
</script>
