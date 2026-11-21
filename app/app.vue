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

const localePath = useLocalePath();

// 分類頁自己有專屬 OG 圖 (nuxt-og-image,只在 SSR 注入);這裡不能再設預設圖,
// 否則 client hydration 後會被預設圖蓋掉
const hasOwnOgImage = computed(() => String(route.name || '').startsWith('group-slug'));
const defaultOgImage = computed(() => (hasOwnOgImage.value ? undefined : `${siteUrl}/img/og_common.png`));

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
  ogImage: () => defaultOgImage.value,
  ogUrl: () => canonicalUrl.value,
  ogLocale: () => ({ zh: 'zh_TW', ja: 'ja_JP', en: 'en_US' })[locale.value] || 'zh_TW',
  twitterCard: 'summary_large_image',
  twitterSite: '@tn604000',
  twitterTitle: () => t('site.title'),
  twitterDescription: () => t('site.description'),
  twitterImage: () => defaultOgImage.value
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
    name: computed(() => t('site.title')),
    description: computed(() => t('schema.site_description')),
    inLanguage: ['zh-TW', 'ja-JP', 'en-US'],
    // 首頁支援 ?q= 預填搜尋,讓搜尋引擎 / AI agent 可以直接帶關鍵字進站
    potentialAction: [
      {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: computed(() => `${siteUrl}${localePath('/')}?q={search_term_string}`)
        },
        'query-input': 'required name=search_term_string'
      }
    ]
  }),
  defineOrganization({
    '@id': '#relive-project',
    name: 'ReLive Project',
    url: 'https://relive-project0.com/'
  }),
  definePerson({
    '@id': '#dada',
    name: computed(() => t('schema.dada_name')),
    alternateName: computed(() => t('schema.dada_alt_names').split(';')),
    description: computed(() => t('schema.dada_description')),
    image: `${siteUrl}/banner.jpg`,
    birthDate: '2021-03-26',
    sameAs: ['https://www.youtube.com/@ReLiveDaDa', 'https://x.com/DadaRelive'],
    memberOf: { '@id': '#relive-project' }
  })
]);
</script>
