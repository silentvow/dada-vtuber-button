<template>
  <v-container fluid class="px-0 h-100">
    <v-row justify="center" class="ma-0 h-100">
      <v-col cols="12" class="pa-0">
        <v-card class="readme-card elevation-2 rounded-lg">
          <iframe
            src="https://docs.google.com/forms/d/e/1FAIpQLSfhrSmBR5MLiHNn0uXgJI43Muavtjan3SeNBB_NFMu0u-hxeg/viewform?embedded=true"
            frameborder="0"
            marginheight="0"
            marginwidth="0"
            style="width: 100%; height: 100%; border: none"
          >
            載入中…
          </iframe>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { computed } from 'vue';

const { t } = useI18n();

// SEO 標籤設定 (套用 app.vue 的 titleTemplate)
useSeoMeta({
  title: () => t('site.feedback'),
  robots: 'noindex, follow' // 純 Google Form iframe,無索引價值
});
</script>

<style scoped>
.readme-card {
  width: 100%;
  height: calc(100vh - 160px);
  margin: 16px auto;
}
</style>
