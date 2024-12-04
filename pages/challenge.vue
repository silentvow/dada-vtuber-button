<template>
  <v-layout column justify-center align-stretch app>
    <v-flex v-if="show_main" xs12 sm8 md6>
      <v-card class="mx-auto">
        <v-card-title class="headline font-weight-bold">{{ $t('site.challenge') }}</v-card-title>
        <v-card-subtitle class="subtitle-1">{{ $t('challenge.description') }}</v-card-subtitle>

        <v-card-text>
          <v-row>
            <v-col cols="12" sm="5" offset-sm="1">
              <v-card :elevation="4">
                <v-card-title class="headline font-weight-bold">{{ $t('challenge.level_normal') }}</v-card-title>
                <v-card-text class="subtitle-1">{{ $t('challenge.level_normal_desc') }}</v-card-text>
                <v-card-text>
                  <v-btn block x-large color="success" @click="startNormalLevel">
                    {{ $t('challenge.start') }}
                  </v-btn>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12" sm="5" offset-sm="0">
              <v-card :elevation="4">
                <v-card-title class="headline font-weight-bold">{{ $t('challenge.level_hard') }}</v-card-title>
                <v-card-text class="subtitle-1">{{ $t('challenge.level_hard_desc') }}</v-card-text>
                <v-card-text>
                  <v-btn block x-large color="primary" @click="startNormalLevel">
                    {{ $t('challenge.start') }}
                  </v-btn>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>
    </v-flex>

    <v-flex v-if="show_result" xs12 sm8 md6>
      <v-card class="mx-auto">
        <v-card-title class="headline font-weight-bold">
          {{ $t('challenge.result') }}：{{ $t(level === 'normal' ? 'challenge.level_normal' : 'challenge.level_hard') }}
        </v-card-title>
        <v-card-subtitle class="subtitle-1">{{ $t('challenge.result_desc') }}</v-card-subtitle>
        <v-card-text class="text-h2 text-secondary"> {{ score }} / 100 </v-card-text>
        <v-card-text class="text-primary"> {{ score_text }}</v-card-text>
        <v-card-text>
          <v-row>
            <v-col cols="12" sm="5">
              <v-btn x-large block color="success" @click="backToMain">{{ $t('challenge.revenge') }}</v-btn>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <v-card v-for="(question, index) in questions" :key="question.id">
        <v-card-title class="headline font-weight-bold">
          {{ $t('challenge.question_no', { no: index + 1, points: index >= 10 ? 8 : 6 }) }}
        </v-card-title>
        <v-card-subtitle class="subtitle-1">{{ $t(`challenge.${question.type}`) }}</v-card-subtitle>
        <v-card-text class="d-flex flex-column align-center">
          <!-- Parent container for the iframe and the background div -->
          <div class="iframe-container mx-5">
            <div v-if="question.loading" class="background-div d-flex align-center justify-center">
              <v-progress-circular indeterminate color="primary" size="56" width="6"></v-progress-circular>
            </div>

            <!-- iframe with load event to hide loading indicator -->
            <iframe
              :src="`https://www.youtube.com/embed/${question.url.slice(-11)}`"
              frameborder="0"
              allowfullscreen
              :style="{
                zIndex: 2,
                position: 'absolute',
                width: '100%',
                height: 'auto',
                maxWidth: '600px',
                aspectRatio: '16/9'
              }"
              @load="loadedQuestion(index)"
            ></iframe>
          </div>
          <v-radio-group
            v-if="question.type !== 'q_multi_choice'"
            v-model="answers[`${question.id}`]"
            readonly
            class="mx-5"
          >
            <v-radio
              v-for="(option, idx) in question?.options"
              :key="option.id"
              :value="option.id"
              readonly
              class="option-item"
            >
              <template v-slot:label>
                <div class="d-flex align-center">
                  <voice-btn
                    ref="voice_btn"
                    :key="option.id"
                    :voice-id="option.id"
                    :button-id="`${option.id}-q${index}`"
                    :style="{ width: '224px' }"
                    @on-play="play(option)"
                  >
                    {{ $t('action.play_option') }} {{ idx + 1 }}
                  </voice-btn>
                  <div class="hint-icon">
                    <v-icon v-if="option.correct" color="success" size="24">{{ icons.correct }}</v-icon>
                    <v-icon v-if="!option.correct && answers[question.id] === option.id" color="error" size="24">
                      {{ icons.wrong }}
                    </v-icon>
                  </div>
                </div>
              </template>
            </v-radio>
          </v-radio-group>
          <v-item-group v-else class="mt-3 mb-2">
            <v-item v-for="(option, idx) in question?.options" :key="option.id" class="mt-1">
              <v-checkbox
                v-model="answers[`${question.id}`]"
                readonly
                hide-details
                :value="option.id"
                class="option-item"
              >
                <template v-slot:label>
                  <div class="d-flex align-center">
                    <voice-btn
                      ref="voice_btn"
                      :key="option.id"
                      :voice-id="option.id"
                      :button-id="`${option.id}-q${index}`"
                      :style="{ width: '224px' }"
                      @on-play="play(option)"
                    >
                      {{ $t('action.play_option') }} {{ idx + 1 }}
                    </voice-btn>
                    <div v-if="isCorrect(question, option)" class="hint-icon">
                      <v-icon color="success" size="24">{{ icons.correct }}</v-icon>
                    </div>
                    <div v-else class="hint-icon">
                      <v-icon color="error" size="24">{{ icons.wrong }}</v-icon>
                    </div>
                  </div>
                </template>
              </v-checkbox>
            </v-item>
          </v-item-group>
        </v-card-text>
      </v-card>
    </v-flex>

    <v-flex v-if="show_questions" xs12 sm8 md6>
      <v-card v-for="(question, index) in questions" :key="question.id">
        <v-card-title class="headline font-weight-bold">
          {{ $t('challenge.question_no', { no: index + 1, points: index >= 10 ? 8 : 6 }) }}
        </v-card-title>
        <v-card-subtitle class="subtitle-1">{{ $t(`challenge.${question.type}`) }}</v-card-subtitle>
        <v-card-text class="d-flex flex-column align-center">
          <!-- Parent container for the iframe and the background div -->
          <div class="iframe-container mx-5">
            <div v-if="question.loading" class="background-div d-flex align-center justify-center">
              <v-progress-circular indeterminate color="primary" size="56" width="6"></v-progress-circular>
            </div>

            <!-- iframe with load event to hide loading indicator -->
            <iframe
              :src="`https://www.youtube.com/embed/${question.url.slice(-11)}`"
              frameborder="0"
              allowfullscreen
              :style="{
                zIndex: 2,
                position: 'absolute',
                width: '100%',
                height: 'auto',
                maxWidth: '600px',
                aspectRatio: '16/9'
              }"
              @load="loadedQuestion(index)"
            ></iframe>
          </div>
          <v-radio-group v-if="question.type !== 'q_multi_choice'" v-model="answers[`${question.id}`]" class="mx-5">
            <v-radio v-for="(option, idx) in question?.options" :key="option.id" :value="option.id">
              <template v-slot:label>
                <div>
                  <voice-btn
                    ref="voice_btn"
                    :key="option.id"
                    :voice-id="option.id"
                    :button-id="`${option.id}-q${index}`"
                    :style="{ width: '256px' }"
                    @on-play="play(option)"
                  >
                    {{ $t('action.play_option') }} {{ idx + 1 }}
                  </voice-btn>
                </div>
              </template>
            </v-radio>
          </v-radio-group>
          <v-item-group v-else class="mt-3 mb-2">
            <v-item v-for="(option, idx) in question?.options" :key="option.id" class="mt-1">
              <v-checkbox v-model="answers[`${question.id}`]" hide-details :value="option.id">
                <template v-slot:label>
                  <voice-btn
                    ref="voice_btn"
                    :key="option.id"
                    :voice-id="option.id"
                    :button-id="`${option.id}-q${index}`"
                    :style="{ width: '256px' }"
                    @on-play="play(option)"
                  >
                    {{ $t('action.play_option') }} {{ idx + 1 }}
                  </voice-btn>
                </template>
              </v-checkbox>
            </v-item>
          </v-item-group>
        </v-card-text>
      </v-card>

      <v-flex class="d-flex flex-column align-center">
        <v-btn class="mx-5 my-6" x-large color="success" :style="{ minWidth: '284px' }" @click="submitAnswer">
          {{ $t('action.submit_answer') }}
        </v-btn>
      </v-flex>

      <v-dialog v-model="show_hint" max-width="600">
        <v-card>
          <v-toolbar class="headline" color="primary" dark>{{ $t('challenge.hint') }}</v-toolbar>
          <v-card-text class="justify-center">
            <div class="text-body-1 text-center pt-8">{{ $t('challenge.hint_desc') }}</div>
          </v-card-text>
          <v-card-actions class="justify-end">
            <v-btn text @click="show_hint = false">
              {{ $t('challenge.close') }}
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

.option-item {
  position: relative;
}
.option-item .hint-icon {
  margin-left: 9px;
}

.iframe-container {
  position: relative;
  width: 100%;
  height: auto;
  max-width: 600px;
  aspect-ratio: 16/9;
}

.background-div {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: #000;
  z-index: 1; /* Ensures it stays behind the iframe */
}
</style>
<script>
import { nanoid } from 'nanoid';
import voice_lists from '~/assets/voices.json';
import VoiceBtn from '../components/VoiceBtn';
import { mdiCheckCircle, mdiCloseCircle } from '@mdi/js';

export default {
  components: {
    VoiceBtn
  },
  data() {
    const voices = voice_lists.groups
      .filter(group => group.group_name !== 'singing')
      .flatMap(group => group.voice_list);
    return {
      icons: {
        correct: mdiCheckCircle,
        wrong: mdiCloseCircle
      },
      voices,
      long_voices: voices.filter(voice => voice.description.zh.length > 7),
      questions: [],
      answers: {},
      answer_result: {},
      score: 0,
      high_score_hard: 0,
      high_score_normal: 0,
      now_playing: new Set(),
      loading: true,
      level: 'normal',
      show_main: true,
      show_questions: false,
      show_hint: false,
      show_result: false
    };
  },
  computed: {
    answer_index() {
      return this.question?.options.findIndex(option => option.correct) + 1;
    },
    current_locale() {
      return this.$i18n.locale;
    },
    score_text() {
      if (this.score === 100) return this.$t('challenge.score100');
      if (this.score >= 80) return this.$t('challenge.score80');
      if (this.score >= 60) return this.$t('challenge.score60');
      if (this.score >= 40) return this.$t('challenge.score40');
      if (this.score >= 20) return this.$t('challenge.score20');
      if (this.score > 0) return this.$t('challenge.score1');
      return this.$t('challenge.score0');
    },
    voice_host() {
      if (process.env.NODE_ENV === 'production')
        return 'https://cdn.jsdelivr.net/gh/silentvow/dada-vtuber-button@master/static/voices/';
      else return '/voices/';
    }
  },
  watch: {
    show_result(value) {
      if (value) return;
      if (this.level === 'normal') {
        this.high_score_normal = Math.max(this.score, this.high_score_normal);
      } else {
        this.high_score_hard = Math.max(this.score, this.high_score_hard);
      }

      this.show_main = true;
      this.show_questions = false;
      this.questions = [];
    }
  },
  mounted() {
    this.loading = false;
  },
  methods: {
    isCorrect(question, option) {
      if (question.type === 'q_multi_choice') {
        return (
          (this.answers[question.id].includes(option.id) && option.correct) ||
          (!this.answers[question.id].includes(option.id) && !option.correct)
        );
      } else {
        return this.answers[question.id] === option.id && option.correct;
      }
    },
    loadedQuestion(index) {
      this.questions[index].loading = false;
    },
    backToMain() {
      this.show_result = false;
      this.show_main = true;
    },
    startNormalLevel() {
      this.level = 'normal';
      this.show_main = false;
      this.answers = {};
      this.generateQuestions();
      this.show_questions = true;
    },
    startHardLevel() {
      this.level = 'hard';
      this.show_main = false;
      this.answers = {};
      this.generateQuestions();
      this.show_questions = true;
    },
    submitAnswer() {
      this.stop_all();

      const filled = this.questions.every(
        q =>
          (q.type !== 'q_multi_choice' && this.answers[q.id] !== undefined) ||
          (q.type === 'q_multi_choice' && this.answers[q.id].length >= 0)
      );
      if (!filled) {
        this.show_hint = true;
        return;
      }

      this.score = this.questions.reduce((acc, question) => {
        if (question.type === 'q_multi_choice') {
          let point = 0;
          question.options.forEach(option => {
            if (this.answers[question.id].includes(option.id) && option.correct) {
              point += 2;
            } else if (!this.answers[question.id].includes(option.id) && !option.correct) {
              point += 2;
            }
          });
          return acc + point;
        } else {
          if (this.answers[question.id] === question.options.find(option => option.correct).id) return acc + 6;
          return acc;
        }
      }, 0);

      this.show_questions = false;
      this.show_result = true;

      window.scrollTo({ top: 0 });
    },
    generateQuestions() {
      // Generate 10 single choice questions
      for (let i = 0; i < 5; i++) {
        this.questions.push(this.generateSingleNegativeQuestion());
      }
      for (let i = 0; i < 5; i++) {
        this.questions.push(this.generateSinglePositiveQuestion());
      }
      this.questions.sort(() => 0.5 - Math.random());
      // Generate 5 multi choice questions
      for (let i = 0; i < 5; i++) {
        this.questions.push(this.generateMultiChoiceQuestion());
      }
      this.questions.forEach((question, index) => {
        question.id = nanoid();
        question.loading = true;
        this.answers[question.id] = index < 10 ? undefined : [];
        this.answer_result[question.id] =
          index < 10
            ? question.options.find(option => option.correct)?.id
            : question.options.filter(option => option.correct).map(option => option.id);
      });
    },
    generateSinglePositiveQuestion() {
      // Flatten the voice list across all groups
      const rawVoiceList = this.level === 'normal' ? this.long_voices : this.voices;
      const voiceList = rawVoiceList.filter(voice => this.questions.every(q => q.url !== voice.url));

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
        type: 'q_positive',
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
    generateSingleNegativeQuestion() {
      // Flatten the voice list across all groups
      const rawVoiceList = this.level === 'normal' ? this.long_voices : this.voices;
      const voiceList = rawVoiceList.filter(voice => this.questions.every(q => q.url !== voice.url));

      // Randomly select three voices with same url
      const otherIndex = Math.floor(Math.random() * voiceList.length);
      const otherVoices = voiceList.filter(v => v.url === voiceList[otherIndex].url);

      if (otherVoices.length < 3) {
        return this.generateSingleNegativeQuestion();
      }

      // Filter out the target voice to pick non-matching options
      const remainingVoices = voiceList.filter(voice => voice.url !== voiceList[otherIndex].url);

      // Shuffle and select three random non-matching voices
      const shuffledOtherVoices = otherVoices.sort(() => 0.5 - Math.random());
      const nonMatchingOptions = shuffledOtherVoices.slice(0, 3);

      const targetVoice = remainingVoices[Math.floor(Math.random() * remainingVoices.length)];

      // Combine the target voice with the non-matching options and shuffle the result
      const voiceOptions = [targetVoice, ...nonMatchingOptions].sort(() => 0.5 - Math.random());

      // Return the result as an object
      return {
        type: 'q_negative',
        url: nonMatchingOptions[0].url,
        options: voiceOptions.map(voice => ({
          id: voice.id,
          name: voice.name,
          description: voice.description,
          path: voice.path,
          correct: voice.url === targetVoice.url
        }))
      };
    },
    generateMultiChoiceQuestion(retry = 10) {
      // Flatten the voice list across all groups
      const voiceList = this.level === 'normal' ? this.long_voices : this.voices;

      // 隨機確定答案數量 (1~4)，使其平均分布
      const possibleAnswerCounts = [1, 2, 3, 4];
      const answerCount = possibleAnswerCounts[Math.floor(Math.random() * possibleAnswerCounts.length)];

      // 隨機選擇答案項目
      const answer = voiceList[Math.floor(Math.random() * voiceList.length)];
      const shuffledVoices = voiceList.sort(() => 0.5 - Math.random());
      const correctAnswers = shuffledVoices.filter(v => v.url === answer.url).slice(0, answerCount);
      if (correctAnswers.length < answerCount) {
        return this.generateMultiChoiceQuestion(retry);
      }
      // if (retry > 0 && this.questions.some(q => q.url === correctAnswers[0].url)) {
      //   return this.generateMultiChoiceQuestion(retry - 1);
      // }
      if (retry > 0 && correctAnswers[0].url === this.questions.at(-1).url) {
        return this.generateMultiChoiceQuestion(retry - 1);
      }

      // 從剩餘選項中選擇干擾項
      const remainingVoices = shuffledVoices.filter(v => v.url !== answer.url);
      const distractors = remainingVoices.slice(0, 4 - answerCount);

      // 合併答案和干擾項，並隨機排列
      const options = [...correctAnswers, ...distractors].sort(() => 0.5 - Math.random());

      // 返回題目對象
      return {
        type: 'q_multi_choice',
        url: answer.url,
        options: options.map(voice => ({
          id: voice.id,
          name: voice.name,
          description: voice.description,
          path: voice.path,
          correct: voice.url === answer.url
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
  },
  head() {
    return {
      title: this.$t('site.challenge') + ' - ' + this.$t('site.title')
    };
  }
};
</script>
