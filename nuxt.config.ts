// https://nuxt.com/docs/api/configuration/nuxt-config
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// 解析 pinia 安裝路徑 (透過 pnpm 也能正確找到),並指向其 ESM build
// 解決 Pinia 3 在 production NODE_ENV 下會解析到 pinia.prod.cjs,導致 SSR 失敗的問題
const require$ = createRequire(import.meta.url);
const piniaPkgPath = require$.resolve('pinia/package.json');
const piniaEsm = resolve(dirname(piniaPkgPath), 'dist/pinia.mjs');

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  // 匯入全域 CSS
  css: ['~~/assets/global.css'],
  ssr: true,

  // SSG: 預先產生所有靜態路由 (排除 /member,因走 Discord OAuth)
  nitro: {
    prerender: {
      crawlLinks: true,
      routes: ['/', '/favorite', '/challenge', '/feedback', '/privacy'],
      ignore: ['/member']
    }
  },

  // 強制 pinia 解析到 ESM build (絕對路徑,因 pinia 套件的 exports 未對外曝露 dist 子路徑)
  alias: {
    pinia: piniaEsm
  },

  // Vuetify SSR 需要被 Vite 內聯處理
  vite: {
    ssr: {
      noExternal: ['vuetify']
    }
  },

  build: {
    transpile: ['vuetify']
  },

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
      DISCORD_API_BASE: process.env.DISCORD_API_BASE,
      // 站點正式網址,給 canonical / og:url / sitemap 使用
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'https://dada-vtuber-button.vercel.app'
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

  // 僅放靜態、跨頁共用的基礎 head;SEO 動態欄位 (title/description/og/canonical) 由 app.vue 使用 useSeoMeta 設定
  app: {
    head: {
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'theme-color', content: '#bd133d' }
      ],
      link: [
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' },
        { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16x16.png' },
        { rel: 'manifest', href: '/site.webmanifest' },
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'shortcut icon', type: 'image/x-icon', href: '/favicon.ico' }
      ]
    }
  }
});
