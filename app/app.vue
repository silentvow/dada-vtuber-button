<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup>
import { computed } from 'vue';

const { t, locale } = useI18n();
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
  ogLocale: () => ({ zh: 'zh_TW', ja: 'ja_JP', en: 'en_US' })[locale.value] || 'zh_TW',
  twitterCard: 'summary_large_image',
  twitterSite: '@tn604000',
  twitterTitle: () => t('site.title'),
  twitterDescription: () => t('site.description'),
  twitterImage: `${siteUrl}/img/og_common.png`
});

// i18n 內建 head composable:hreflang alternates + canonical + og:locale:alternate
const i18nHead = useLocaleHead({ seo: true });

useHead({
  htmlAttrs: {
    lang: htmlLang
  },
  link: () => i18nHead.value.link || [],
  meta: () => i18nHead.value.meta || []
});

// JSON-LD 結構化資料 — 給搜尋引擎與 LLM (AEO) 識別站點實體
useSchemaOrg([
  defineWebSite({
    name: '灰妲語音博物館',
    description: '收藏台V「灰妲」(ReLive Project) 的各種語音與獨特叫聲,點擊即可播放。',
    inLanguage: ['zh-TW', 'ja-JP', 'en-US']
  }),
  defineOrganization({
    '@id': '#relive-project',
    name: 'ReLive Project',
    url: 'https://relive-project0.com/'
  }),
  definePerson({
    '@id': '#dada',
    name: '灰妲',
    alternateName: ['フイダ', 'DaDa', 'Gray Da'],
    description: 'ReLive Project 旗下台灣 Vtuber,2021 年 3 月 26 日出道。',
    image: `${siteUrl}/banner.jpg`,
    birthDate: '2021-03-26',
    sameAs: ['https://www.youtube.com/@ReLiveDaDa', 'https://x.com/DadaRelive'],
    memberOf: { '@id': '#relive-project' }
  })
]);
</script>
