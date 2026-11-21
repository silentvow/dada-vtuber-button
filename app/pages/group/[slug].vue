<template>
  <v-container fluid class="px-0">
    <v-col cols="12" class="pa-0" style="min-width: 85%">
      <v-btn
        :to="localePath('/')"
        :prepend-icon="mdiArrowLeft"
        variant="text"
        class="text-none mb-2 px-0"
        :class="dark_text"
      >
        {{ $t('group.back') }}
      </v-btn>

      <h1 class="text-h4 font-weight-bold mb-2" :class="dark_text">{{ groupName }}</h1>
      <p class="mb-6" :class="dark_text">{{ summary }}</p>

      <div class="d-flex flex-wrap ga-2">
        <VoiceBtn
          v-for="item in group.voice_list"
          :key="item.id"
          :voice-id="item.id"
          :from-youtube="Boolean(item.url)"
          @on-play="play(item)"
          @on-youtube="openModal(item)"
          @on-download="download(item)"
        >
          {{ item.description[current_locale] || item.description['zh'] }}
        </VoiceBtn>
      </div>
    </v-col>

    <v-dialog v-model="is_dialog_open" max-width="600px">
      <v-card>
        <v-card-title>
          {{ `${$t('site.voice')}：${dialog_item.description[current_locale]}` }}
        </v-card-title>
        <v-card-text>
          <span>{{ $t('site.source') }}：</span>
          <a :href="dialog_item.url" target="_blank" rel="noreferrer" class="text-primary">{{ dialog_item.url }}</a>
        </v-card-text>
        <iframe
          v-if="dialog_item.url"
          class="mx-auto d-block"
          :src="`https://www.youtube-nocookie.com/embed/${dialog_item.url.slice(-11)}`"
          :title="`${$t('action.stream_player_title')}：${dialog_item.description[current_locale]}`"
          allowfullscreen
          :style="{ width: 'calc(100% - 40px)', height: 'auto', aspectRatio: '16/9' }"
        ></iframe>
        <v-card-actions>
          <v-btn class="ml-auto px-6" color="primary" variant="flat" @click="is_dialog_open = false">
            {{ $t('control.disabled') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { mdiArrowLeft } from '@mdi/js';

const route = useRoute();
const { t, locale } = useI18n();
const localePath = useLocalePath();
const audioStore = useAudioStore();
const settings = useSettingsStore();
const { gtag } = useGtag();

const slug = route.params.slug;

// 只取這個分類 (見 server/api/groups/[slug].get.ts),payload 才不會夾帶整份 voices.json
const { data: group, error } = await useAsyncData(`group-${slug}`, () => $fetch(`/api/groups/${slug}`));
if (error.value || !group.value) {
  throw createError({ statusCode: 404, statusMessage: 'Group not found', fatal: true });
}

const current_locale = computed(() => locale.value);
const groupName = computed(
  () => group.value.group_description[locale.value] || group.value.group_description.zh || group.value.group_name
);
const summary = computed(() => t('group.summary', { count: group.value.voice_list.length }));
const dark_text = computed(() => ({ 'text-grey-lighten-2': settings.dark }));

const is_dialog_open = ref(false);
const dialog_item = ref({ description: {}, url: '' });
watch(is_dialog_open, open => {
  if (!open) dialog_item.value = { description: {}, url: '' };
});

const openModal = item => {
  dialog_item.value = item;
  is_dialog_open.value = true;
};

const download = item => {
  const a = document.createElement('a');
  a.target = '_blank';
  a.href = getPrimaryVoiceUrl(item.path);
  a.download = item.path.split('/').pop();
  a.click();
};

const play = item => {
  audioStore.play(item, item.description[current_locale.value], t('control.full_name'), t('site.title'));
  if (import.meta.env.PROD && gtag) {
    gtag('event', 'play', { event_category: 'Audios', event_label: item.name + ' ' + item.description['zh'] });
  }
};

// SEO / AEO
useSeoMeta({
  title: () => groupName.value,
  description: () => t('group.description', { name: groupName.value, count: group.value.voice_list.length }),
  ogTitle: () => groupName.value,
  ogDescription: () => summary.value
});

defineOgImage('Group', {
  title: groupName.value,
  subtitle: summary.value,
  siteName: t('site.title')
});

useSchemaOrg([
  defineWebPage({ '@type': 'CollectionPage', name: () => groupName.value }),
  defineBreadcrumb({
    itemListElement: [{ name: () => t('site.index'), item: () => localePath('/') }, { name: () => groupName.value }]
  }),
  {
    '@type': 'ItemList',
    name: () => groupName.value,
    numberOfItems: group.value.voice_list.length,
    itemListElement: group.value.voice_list.map((v, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: v.description[locale.value] || v.description.zh
    }))
  }
]);
</script>
