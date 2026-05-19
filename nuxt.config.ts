// https://nuxt.com/docs/api/configuration/nuxt-config
import { createRequire } from 'node:module';
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

  // SSG: 預先產生所有靜態路由 (含三語系)
  // i18n strategy = prefix_except_default 之後,日/英語版會有 /ja /en 前綴
  // /compose 跟 /member 雖然 ssr:false,還是 prerender 一份 HTML stub,
  // 讓使用者直接打 URL 進來時 hosting (Vercel SSG) 能 serve 而不是 404。
  // stub 是空殼 + 全部 JS,進來後 client-side 自己 hydrate 整頁。
  // preset=vercel:讓 nitro server routes (/api/discord/token, /api/discord/refresh)
  // 變成 Vercel serverless functions,可以在 runtime 拿 DISCORD_CLIENT_SECRET 跟 Discord 換 token。
  // prerendered pages 還是 prerender (純靜態 CDN),只有 /api/* 走 function。
  nitro: {
    preset: 'vercel',
    prerender: {
      crawlLinks: true,
      routes: [
        '/', '/favorite', '/compose', '/soundboard', '/challenge', '/feedback', '/privacy',
        '/ja', '/ja/favorite', '/ja/compose', '/ja/soundboard', '/ja/challenge', '/ja/feedback', '/ja/privacy',
        '/en', '/en/favorite', '/en/compose', '/en/soundboard', '/en/challenge', '/en/feedback', '/en/privacy'
        // /sitemap.xml 也會 prerender,由下方的 inline module 在 modules:done 階段
        // 加回去 (因為 @nuxtjs/sitemap 預設會把它從 prerender 清單裡 filter 掉)。
      ],
      ignore: ['/member', '/ja/member', '/en/member']
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
    // SEO 主套件:整合 sitemap / robots / schema-org / og-image / link-checker
    '@nuxtjs/seo',
    // 圖片優化:自動 WebP/AVIF、lazy、srcset
    '@nuxt/image',
    // Vercel Web Analytics — 自動 inject `_vercel/insights/script.js` 並追蹤 pageview/route
    '@vercel/analytics/nuxt',
    // 把 @nuxtjs/sitemap 預設加在 /sitemap.xml 的 redirect / handler 清掉,
    // 改由 server/routes/sitemap.xml.ts 直接吐 XML。
    // 必須放在 '@nuxtjs/seo' (內含 sitemap 模組) 之後才能對 serverHandlers 做後置處理。
    (_options, nuxt) => {
      nuxt.hook('modules:done', () => {
        // 1) 移除 routeRules 的 307 redirect (Vercel preset 會把這條 routeRule 變成 edge redirect)
        const rules = nuxt.options.nitro?.routeRules;
        if (rules?.['/sitemap.xml'] && 'redirect' in rules['/sitemap.xml']) {
          delete rules['/sitemap.xml'];
        }
        // 2) 移除 sitemap 模組注入的 /sitemap.xml handler (它會 sendRedirect 到 sitemap_index.xml),
        //    保留我們自己的 server/routes/sitemap.xml.ts (那條是 Nitro 自動掃 server/ 進來,
        //    不會出現在這個 serverHandlers 陣列裡)。
        if (Array.isArray(nuxt.options.serverHandlers)) {
          nuxt.options.serverHandlers = nuxt.options.serverHandlers.filter((h) => {
            return !(h?.route === '/sitemap.xml' && typeof h?.handler === 'string' && h.handler.includes('@nuxtjs/sitemap'));
          });
        }
        // 3) sitemap 模組會在 setupPrerenderHandler 裡把 /sitemap.xml 從 nitro.prerender.routes
        //    filter 掉 (它預設假設 /sitemap.xml 是 redirect,不應該被 prerender)。
        //    我們現在改成真的 serve XML 了,需要把它加回去,Vercel 才能 serve 成靜態檔。
        const prerender = nuxt.options.nitro?.prerender;
        if (prerender) {
          prerender.routes = prerender.routes || [];
          if (!prerender.routes.includes('/sitemap.xml')) {
            prerender.routes.push('/sitemap.xml');
          }
        }
      });
    }
  ],

  // @nuxt/image 設定
  image: {
    format: ['webp', 'jpg'],
    quality: 80,
    // 預先在 build 時就把 banner 壓好 (Vercel static hosting,無 runtime IPX server)
    densities: [1, 2],
    screens: {
      sm: 640,
      md: 1024,
      lg: 1280,
      xl: 1920
    }
  },

  // @nuxtjs/seo 共用的站點設定 (sitemap / canonical / og:url / robots 都會用)
  site: {
    url: 'https://dada-vtuber-button.vercel.app',
    name: '灰妲語音博物館',
    description:
      '歡迎來到灰妲語音博物館!這裡收藏了灰妲的各種語音與獨特叫聲,粉絲可以隨時點擊播放,探索她迷人的聲音世界,感受她獨一無二的魅力。',
    defaultLocale: 'zh-TW'
  },

  // robots.txt 由模組產生,取代 public/robots.txt
  robots: {
    disallow: ['/member'],
    blockNonSeoBots: true // 自動封鎖 Ahrefs / MJ12 等非搜尋引擎爬蟲
  },

  // 自動產生 sitemap.xml,含 i18n hreflang
  sitemap: {
    // soundboard 是給實況主的工具,robots noindex,sitemap 也不列
    exclude: ['/member', '/feedback', '/soundboard', '/*/member', '/*/feedback', '/*/soundboard']
  },

  gtag: {
    id: 'G-JHW2E0H1PQ'
  },

  // Vuetify 3 配置
  vuetify: {
    moduleOptions: {
      /* 模組選項 */
    },
    vuetifyOptions: {
      // 使用 SVG icon set (從 @mdi/js 個別 import,只 bundle 用到的 icon)
      // 取代原本的 mdi-font webfont (403KB woff2)
      icons: {
        defaultSet: 'mdi-svg'
      },
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
    // server-only (不出貨到 client bundle):Discord OAuth Authorization Code Grant
    // 需要 client_secret 跟 Discord 換 token,只能放後端
    DISCORD_CLIENT_SECRET: process.env.DISCORD_CLIENT_SECRET,
    public: {
      DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID,
      DISCORD_REDIRECT_URI: process.env.DISCORD_REDIRECT_URI,
      DISCORD_API_BASE: process.env.DISCORD_API_BASE,
      // 站點正式網址,給 canonical / og:url / sitemap 使用
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'https://dada-vtuber-button.vercel.app'
    }
  },

  // i18n 配置:三語系各自獨立 URL,SEO 友善
  i18n: {
    locales: [
      { code: 'en', language: 'en-US', file: 'en.json' },
      { code: 'ja', language: 'ja-JP', file: 'ja.json' },
      { code: 'zh', language: 'zh-TW', file: 'default.json' } // 預設語系,無 URL prefix
    ],
    defaultLocale: 'zh',
    langDir: 'locales/',
    strategy: 'prefix_except_default',
    detectBrowserLanguage: false, // 關閉自動偵測,避免 SSG/canonical 與 i18n 衝突
    baseUrl: 'https://dada-vtuber-button.vercel.app'
  },

  // 僅放靜態、跨頁共用的基礎 head;SEO 動態欄位 (title/description/og/canonical) 由 app.vue 使用 useSeoMeta 設定
  app: {
    head: {
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'theme-color', content: '#bd133d' }
      ],
      // Critical CSS:在 entry.css 載入前就預留 v-app-bar (48px) 與 v-navigation-drawer (256px)
      // 的空間,避免 hydration 時 v-main 位移造成 CLS。
      // - body{margin:0} — 蓋掉 browser 預設 8px margin (Vuetify 的 *{margin:0} 在 entry.css 裡而 entry.css 是 preload+swap)
      // - 預設 (mobile):只 reserve toolbar 高度,不 reserve drawer (mobile 為 temporary overlay)
      // - 桌面 (>=1024px):額外 reserve drawer 寬度 256px
      style: [
        {
          innerHTML: `body{margin:0}.v-main{padding-top:48px!important}@media (min-width:1024px){.v-main{padding-left:256px!important}}`
        }
      ],
      link: [
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' },
        { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16x16.png' },
        { rel: 'manifest', href: '/site.webmanifest' },
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'shortcut icon', type: 'image/x-icon', href: '/favicon.ico' },
        // 預連線到 jsDelivr — 語音檔與 twemoji 都從這個 CDN 抓
        { rel: 'preconnect', href: 'https://cdn.jsdelivr.net', crossorigin: '' },
        { rel: 'dns-prefetch', href: 'https://cdn.jsdelivr.net' },
        // 預連線到 raw.githubusercontent — 語音播放會跟 jsdelivr 平行 race
        { rel: 'preconnect', href: 'https://raw.githubusercontent.com', crossorigin: '' },
        { rel: 'dns-prefetch', href: 'https://raw.githubusercontent.com' },
        // 預連線到 GitHub Pages — 第三條 race 路線,任一可用就播
        { rel: 'preconnect', href: 'https://silentvow.github.io', crossorigin: '' },
        { rel: 'dns-prefetch', href: 'https://silentvow.github.io' }
      ]
    }
  }
});
