<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup>
import { computed } from 'vue';

const { t, locale, locales } = useI18n();
const route = useRoute();
const config = useRuntimeConfig();

const siteUrl = config.public.siteUrl;

// 將 i18n locale code 轉成 BCP 47 html lang
const htmlLang = computed(() => {
  const map = { zh: 'zh-TW', ja: 'ja-JP', en: 'en-US' };
  return map[locale.value] || 'zh-TW';
});

const canonicalUrl = computed(() => `${siteUrl}${route.path === '/' ? '' : route.path}`);

// 全站基礎 SEO meta (各頁可用 useSeoMeta 覆蓋 title / description / og:image)
useSeoMeta({
  titleTemplate: title => (title ? `${title} - ${t('site.title')}` : t('site.title')),
  description: () => t('site.description'),
  keywords: () => t('site.keywords'),
  ogSiteName: () => t('site.title'),
  ogType: 'website',
  ogTitle: () => t('site.title'),
  ogDescription: () => t('site.description'),
  ogImage: `${siteUrl}/img/og_common.png`,
  ogUrl: () => canonicalUrl.value,
  ogLocale: () =>
    ({ zh: 'zh_TW', ja: 'ja_JP', en: 'en_US' }[locale.value] || 'zh_TW'),
  twitterCard: 'summary_large_image',
  twitterSite: '@tn604000',
  twitterTitle: () => t('site.title'),
  twitterDescription: () => t('site.description'),
  twitterImage: `${siteUrl}/img/og_common.png`
});

useHead({
  htmlAttrs: {
    lang: htmlLang
  },
  link: [
    { rel: 'canonical', href: canonicalUrl }
  ]
});
</script>
