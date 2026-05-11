<template>
  <v-container fluid class="px-0">
    <v-row justify="center" class="ma-0">
      <v-col cols="12">
        <v-card v-if="show_main" class="mx-auto rounded-lg elevation-2 mb-6">
          <v-card-title class="text-h5 font-weight-bold pt-4">{{ $t('site.challenge') }}</v-card-title>
          <v-card-subtitle class="text-subtitle-1">{{ $t('challenge.description') }}</v-card-subtitle>

          <v-card-text class="pt-4">
            <v-row>
              <v-col cols="12" sm="6">
                <v-card variant="outlined" class="rounded-lg h-100 d-flex flex-column">
                  <v-card-title class="text-h6 font-weight-bold">{{ $t('challenge.level_normal') }}</v-card-title>
                  <v-card-text class="text-body-1 flex-grow-1">{{ $t('challenge.level_normal_desc') }}</v-card-text>
                  <v-card-text>
                    <v-btn block size="x-large" color="success" variant="flat" @click="startNormalLevel">
                      {{ $t('challenge.start') }}
                    </v-btn>
                  </v-card-text>
                </v-card>
              </v-col>
              <v-col cols="12" sm="6">
                <v-card variant="outlined" class="rounded-lg h-100 d-flex flex-column">
                  <v-card-title class="text-h6 font-weight-bold">{{ $t('challenge.level_hard') }}</v-card-title>
                  <v-card-text class="text-body-1 flex-grow-1">{{ $t('challenge.level_hard_desc') }}</v-card-text>
                  <v-card-text>
                    <v-btn block size="x-large" color="primary" variant="flat" @click="startHardLevel">
                      {{ $t('challenge.start') }}
                    </v-btn>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <v-card v-if="show_result" class="mx-auto rounded-lg elevation-2 mb-6 text-center pb-4">
          <v-card-title class="text-h5 font-weight-bold pt-4">
            {{ $t('challenge.result') }}：{{
              $t(level === 'normal' ? 'challenge.level_normal' : 'challenge.level_hard')
            }}
          </v-card-title>
          <v-card-subtitle class="text-subtitle-1">{{ $t('challenge.result_desc') }}</v-card-subtitle>

          <v-card-text class="py-6">
            <div class="text-h2 font-weight-bold text-secondary mb-2">{{ score }} / 100</div>
            <div class="text-h6 text-primary">{{ score_text }}</div>
          </v-card-text>

          <v-card-text>
            <v-row justify="center">
              <v-col cols="12" sm="6">
                <v-btn size="x-large" block color="success" variant="flat" @click="backToMain">
                  {{ $t('challenge.revenge') }}
                </v-btn>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <v-card v-for="(question, index) in questions" :key="question.id" class="mb-6 rounded-lg elevation-2">
          <v-card-title class="text-h6 font-weight-bold pt-4">
            {{ $t('challenge.question_no', { no: index + 1, points: index >= 10 ? 8 : 6 }) }}
          </v-card-title>
          <v-card-subtitle class="text-subtitle-1">{{ $t(`challenge.${question.type}`) }}</v-card-subtitle>

          <v-card-text class="d-flex flex-column align-center">
            <div class="iframe-container mx-auto my-4 w-100">
              <div v-if="question.loading" class="background-div d-flex align-center justify-center rounded">
                <v-progress-circular indeterminate color="primary" size="56" width="6"></v-progress-circular>
              </div>
              <iframe
                :src="`https://www.youtube.com/embed/${question.url.slice(-11)}`"
                frameborder="0"
                allowfullscreen
                class="rounded"
                :style="{ zIndex: 2, position: 'absolute', width: '100%', height: '100%' }"
                @load="loadedQuestion(index)"
              ></iframe>
            </div>

            <v-radio-group
              v-if="question.type !== 'q_multi_choice'"
              v-model="answers[question.id]"
              :readonly="show_result"
              class="w-auto px-sm-5"
            >
              <v-radio v-for="(option, idx) in question.options" :key="option.id" :value="option.id" class="mb-2">
                <template #label>
                  <div class="d-flex align-center w-100">
                    <VoiceBtn
                      :voice-id="option.id"
                      :button-id="`${option.id}-q${index}`"
                      style="min-width: 200px; max-width: 250px"
                      @on-play="play(option)"
                    >
                      {{ $t('action.play_option') }} {{ idx + 1 }}
                    </VoiceBtn>

                    <div v-if="show_result" class="ml-3">
                      <v-icon v-if="option.correct" color="success" size="24" :icon="mdiCheckCircle"></v-icon>
                      <v-icon
                        v-else-if="answers[question.id] === option.id"
                        color="error"
                        size="24"
                        :icon="mdiCloseCircle"
                      ></v-icon>
                    </div>
                  </div>
                </template>
              </v-radio>
            </v-radio-group>

            <div v-else class="px-sm-5 mt-2">
              <v-checkbox
                v-for="(option, idx) in question.options"
                :key="option.id"
                v-model="answers[question.id]"
                :value="option.id"
                :readonly="show_result"
                hide-details
              >
                <template #label>
                  <div class="d-flex align-center w-100">
                    <VoiceBtn
                      :voice-id="option.id"
                      :button-id="`${option.id}-q${index}`"
                      style="min-width: 200px; max-width: 250px"
                      @on-play="play(option)"
                    >
                      {{ $t('action.play_option') }} {{ idx + 1 }}
                    </VoiceBtn>

                    <div v-if="show_result" class="ml-3">
                      <v-icon
                        v-if="isCorrect(question, option)"
                        color="success"
                        size="24"
                        :icon="mdiCheckCircle"
                      ></v-icon>
                      <v-icon v-else color="error" size="24" :icon="mdiCloseCircle"></v-icon>
                    </div>
                  </div>
                </template>
              </v-checkbox>
            </div>
          </v-card-text>
        </v-card>

        <div v-if="show_questions" class="d-flex justify-center mt-6 mb-12">
          <v-btn size="x-large" color="success" variant="flat" min-width="284" @click="submitAnswer">
            {{ $t('action.submit_answer') }}
          </v-btn>
        </div>

        <v-dialog v-model="show_hint" max-width="500">
          <v-card class="rounded-lg">
            <v-card-title class="bg-primary text-white py-4 text-h6">
              {{ $t('challenge.hint') }}
            </v-card-title>
            <v-card-text class="pt-6 text-center text-body-1">
              {{ $t('challenge.hint_desc') }}
            </v-card-text>
            <v-card-actions class="justify-end pb-4 pr-4">
              <v-btn color="primary" variant="text" @click="show_hint = false">
                {{ $t('challenge.close') }}
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { mdiCheckCircle, mdiCloseCircle } from '@mdi/js';
import voice_lists from '~~/assets/voices.json';
import VoiceBtn from '../components/VoiceBtn.vue';

const { t, locale } = useI18n();
const audioStore = useAudioStore();

// 準備原始題庫資料
const voices = voice_lists.groups.filter(group => group.group_name !== 'singing').flatMap(group => group.voice_list);
const long_voices = voices.filter(voice => voice.description.zh.length > 7);

// 狀態管理
const questions = ref([]);
const answers = ref({});
const answer_result = ref({});
const score = ref(0);

// 使用 cookie 持久化最高分紀錄
const highScoreNormal = useCookie('high_score_normal', { default: () => 0 });
const highScoreHard = useCookie('high_score_hard', { default: () => 0 });

const level = ref('normal');
const show_main = ref(true);
const show_questions = ref(false);
const show_hint = ref(false);
const show_result = ref(false);

// 計算屬性
const current_locale = computed(() => locale.value);

const score_text = computed(() => {
  if (score.value === 100) return t('challenge.score100');
  if (score.value >= 80) return t('challenge.score80');
  if (score.value >= 60) return t('challenge.score60');
  if (score.value >= 40) return t('challenge.score40');
  if (score.value >= 20) return t('challenge.score20');
  if (score.value > 0) return t('challenge.score1');
  return t('challenge.score0');
});

const voice_host = computed(() => {
  if (import.meta.env.PROD) {
    return 'https://cdn.jsdelivr.net/gh/silentvow/dada-vtuber-button@master/public/voices/';
  }
  return '/voices/';
});

// 監聽結果頁，儲存最高分並重置狀態
watch(show_result, value => {
  if (value) return;
  if (level.value === 'normal') {
    highScoreNormal.value = Math.max(score.value, highScoreNormal.value);
  } else {
    highScoreHard.value = Math.max(score.value, highScoreHard.value);
  }
  show_main.value = true;
  show_questions.value = false;
  questions.value = [];
});

// 方法
const isCorrect = (question, option) => {
  if (question.type === 'q_multi_choice') {
    const isSelected = answers.value[question.id]?.includes(option.id);
    return (isSelected && option.correct) || (!isSelected && !option.correct);
  }
  return answers.value[question.id] === option.id && option.correct;
};

const loadedQuestion = index => {
  questions.value[index].loading = false;
};

const backToMain = () => {
  show_result.value = false;
};

const startNormalLevel = () => {
  level.value = 'normal';
  show_main.value = false;
  answers.value = {};
  generateQuestions();
  show_questions.value = true;
};

const startHardLevel = () => {
  level.value = 'hard';
  show_main.value = false;
  answers.value = {};
  generateQuestions();
  show_questions.value = true;
};

const submitAnswer = () => {
  audioStore.stopAll();

  // 檢查是否全部作答完畢
  const filled = questions.value.every(
    q =>
      (q.type !== 'q_multi_choice' && answers.value[q.id] !== undefined) ||
      (q.type === 'q_multi_choice' && answers.value[q.id] && answers.value[q.id].length >= 0)
  );

  if (!filled) {
    show_hint.value = true;
    return;
  }

  // 計算分數
  score.value = questions.value.reduce((acc, question) => {
    if (question.type === 'q_multi_choice') {
      let point = 0;
      question.options.forEach(option => {
        const isSelected = answers.value[question.id].includes(option.id);
        if (isSelected && option.correct) point += 2;
        else if (!isSelected && !option.correct) point += 2;
      });
      return acc + point;
    } else {
      const correctOptionId = question.options.find(opt => opt.correct).id;
      if (answers.value[question.id] === correctOptionId) return acc + 6;
      return acc;
    }
  }, 0);

  show_questions.value = false;
  show_result.value = true;
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// 播放與音效管理 (直接呼叫 AudioStore，程式碼銳減！)
const play = item => {
  // 將選項名稱與描述丟給 Store 記錄與播放
  audioStore.play(item, voice_host.value, current_locale.value);
};

// 題庫生成邏輯
const generateQuestions = () => {
  // 5 題單選負向、5 題單選正向
  for (let i = 0; i < 5; i++) questions.value.push(generateSingleNegativeQuestion());
  for (let i = 0; i < 5; i++) questions.value.push(generateSinglePositiveQuestion());

  // 打亂前 10 題
  questions.value.sort(() => 0.5 - Math.random());

  // 5 題多選題
  for (let i = 0; i < 5; i++) questions.value.push(generateMultiChoiceQuestion());

  // 初始化每題的 ID、Loading 與答案儲存空間
  questions.value.forEach((question, index) => {
    // 使用瀏覽器內建的原生 UUID，不再需要 nanoid
    question.id = crypto.randomUUID();
    question.loading = true;

    answers.value[question.id] = index < 10 ? undefined : [];
    answer_result.value[question.id] =
      index < 10
        ? question.options.find(opt => opt.correct)?.id
        : question.options.filter(opt => opt.correct).map(opt => opt.id);
  });
};

const generateSinglePositiveQuestion = () => {
  const rawVoiceList = level.value === 'normal' ? long_voices : voices;
  const voiceList = rawVoiceList.filter(voice => questions.value.every(q => q.url !== voice.url));

  const targetVoice = voiceList[Math.floor(Math.random() * voiceList.length)];
  const remainingVoices = voiceList.filter(voice => voice.url !== targetVoice.url);

  const nonMatchingOptions = remainingVoices.sort(() => 0.5 - Math.random()).slice(0, 3);
  const voiceOptions = [targetVoice, ...nonMatchingOptions].sort(() => 0.5 - Math.random());

  return {
    type: 'q_positive',
    url: targetVoice.url,
    options: voiceOptions.map(voice => ({
      ...voice,
      correct: voice.url === targetVoice.url
    }))
  };
};

const generateSingleNegativeQuestion = () => {
  const rawVoiceList = level.value === 'normal' ? long_voices : voices;
  const voiceList = rawVoiceList.filter(voice => questions.value.every(q => q.url !== voice.url));

  const otherIndex = Math.floor(Math.random() * voiceList.length);
  const otherVoices = voiceList.filter(v => v.url === voiceList[otherIndex].url);

  if (otherVoices.length < 3) return generateSingleNegativeQuestion();

  const remainingVoices = voiceList.filter(voice => voice.url !== voiceList[otherIndex].url);
  const nonMatchingOptions = otherVoices.sort(() => 0.5 - Math.random()).slice(0, 3);

  const targetVoice = remainingVoices[Math.floor(Math.random() * remainingVoices.length)];
  const voiceOptions = [targetVoice, ...nonMatchingOptions].sort(() => 0.5 - Math.random());

  return {
    type: 'q_negative',
    url: nonMatchingOptions[0].url,
    options: voiceOptions.map(voice => ({
      ...voice,
      correct: voice.url === targetVoice.url
    }))
  };
};

const generateMultiChoiceQuestion = (retry = 10) => {
  const voiceList = level.value === 'normal' ? long_voices : voices;
  const possibleAnswerCounts = [1, 2, 3, 4];
  const answerCount = possibleAnswerCounts[Math.floor(Math.random() * possibleAnswerCounts.length)];

  const answer = voiceList[Math.floor(Math.random() * voiceList.length)];
  const shuffledVoices = voiceList.sort(() => 0.5 - Math.random());
  const correctAnswers = shuffledVoices.filter(v => v.url === answer.url).slice(0, answerCount);

  if (correctAnswers.length < answerCount) return generateMultiChoiceQuestion(retry);
  if (retry > 0 && questions.value.length > 0 && correctAnswers[0].url === questions.value.at(-1).url) {
    return generateMultiChoiceQuestion(retry - 1);
  }

  const remainingVoices = shuffledVoices.filter(v => v.url !== answer.url);
  const distractors = remainingVoices.slice(0, 4 - answerCount);

  const options = [...correctAnswers, ...distractors].sort(() => 0.5 - Math.random());

  return {
    type: 'q_multi_choice',
    url: answer.url,
    options: options.map(voice => ({
      ...voice,
      correct: voice.url === answer.url
    }))
  };
};

// SEO 與標題 (套用 app.vue 的 titleTemplate)
useSeoMeta({
  title: () => t('site.challenge'),
  description: () => t('challenge.description'),
  ogDescription: () => t('challenge.description')
});
</script>

<style scoped>
.iframe-container {
  position: relative;
  max-width: 600px;
  aspect-ratio: 16/9;
}

.background-div {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: #1e1e1e;
  z-index: 1;
}

.w-100 {
  width: 100%;
}
</style>
