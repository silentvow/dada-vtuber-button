// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  // 匯入全域 CSS
  css: ['~~/assets/global.css'],
  ssr: false,

  modules: [
    'vuetify-nuxt-module',
    '@nuxtjs/i18n',
    '@pinia/nuxt',
    '@pinia-plugin-persistedstate/nuxt',
    'nuxt-gtag',
    '@nuxtjs/tailwindcss'
  ],

  gtag: {
    id: 'G-JHW2E0H1PQ'
  },

  // Vuetify 3 配置
  vuetify: {
    moduleOptions: {
      /* 模組選項 */
    },
    vuetifyOptions: {
      theme: {
        defaultTheme: 'dark',
        themes: {
          light: {
            dark: false,
            colors: {
              primary: '#bd133d', // 灰妲紅
              secondary: '#212121', // grey.darken4
              accent: '#ff8a80', // red.accent1
              error: '#ff5722', // deepOrange.base
              warning: '#ff9800', // orange.base
              info: '#607d8b', // blueGrey.base
              success: '#009688' // teal.base
            }
          },
          dark: {
            dark: true,
            colors: {
              primary: '#bd133d', // 灰妲紅
              secondary: '#212121', // grey.darken4
              accent: '#ff8a80', // red.accent1
              error: '#dd2c00', // deepOrange.accent4
              warning: '#ffc107', // amber.base
              info: '#26a69a', // teal.lighten1
              success: '#00e676' // green.accent3
            }
          }
        }
      }
    }
  },

  runtimeConfig: {
    public: {
      DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID,
      DISCORD_REDIRECT_URI: process.env.DISCORD_REDIRECT_URI,
      DISCORD_API_BASE: process.env.DISCORD_API_BASE
    }
  },

  // i18n 配置
  i18n: {
    locales: [
      { code: 'en', iso: 'en-US', file: 'en.json' },
      { code: 'ja', iso: 'ja-JP', file: 'ja.json' },
      { code: 'zh', iso: 'zh-TW', file: 'default.json' } // 原本的預設語系
    ],
    defaultLocale: 'zh',
    langDir: 'locales/', // 指向原本的翻譯檔目錄
    strategy: 'no_prefix'
  },

  app: {
    head: {
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content:
            '歡迎來到灰妲語音博物館！這裡收藏了灰妲的各種語音與獨特叫聲，粉絲可以隨時點擊播放，探索她迷人的聲音世界，感受她獨一無二的魅力。'
        },
        {
          name: 'keywords',
          content: '灰妲,Vtuber,台V,語音按鈕,ReLive Project'
        },
        { property: 'og:site_name', content: '灰妲語音博物館' },
        { property: 'og:type', content: 'website' },
        { property: 'og:url', content: '灰妲語音博物館' },
        { property: 'og:title', content: '灰妲語音博物館' },
        {
          property: 'og:description',
          content:
            '歡迎來到灰妲語音博物館！這裡收藏了灰妲的各種語音與獨特叫聲，粉絲可以隨時點擊播放，探索她迷人的聲音世界，感受她獨一無二的魅力。'
        },
        { property: 'og:image', content: 'https://dada-vtuber-button.vercel.app/img/og_common.png' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:site', content: '@tn604000' }
      ],
      link: [
        { rel: 'apple-touch-icon', sizes: '180x180', href: 'apple-touch-icon.png' },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: 'favicon-32x32.png' },
        { rel: 'icon', type: 'image/png', sizes: '16x16', href: 'favicon-16x16.png' },
        { rel: 'manifest', href: 'site.webmanifest' },
        { rel: 'icon', type: 'image/x-icon', href: 'favicon.ico' },
        { rel: 'shortcut icon', type: 'image/x-icon', href: 'favicon.ico' }
      ]
    }
  }
});
