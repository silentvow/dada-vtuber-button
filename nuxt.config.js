import trs from './assets/locales/default.json';
import themes from './assets/themes';
const is_production = process.env.NODE_ENV === 'production';

export default {
  ssr: false,
  target: 'static',
  server: {
    port: 3000, // default: 3000
    host: 'localhost' // default: localhost
  },
  /*
   ** Headers of the page
   */
  head: {
    title: trs.site.title,
    meta: [
      { charset: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      {
        hid: 'description',
        name: 'description',
        content: trs.site.description
      },
      {
        hid: 'keywords',
        name: 'keywords',
        content: trs.site.keywords
      },
      { hid: 'og:site_name', property: 'og:site_name', content: trs.site.title },
      { hid: 'og:type', property: 'og:type', content: 'website' },
      { hid: 'og:url', property: 'og:url', content: trs.site.title },
      { hid: 'og:title', property: 'og:title', content: trs.site.title },
      {
        hid: 'og:description',
        property: 'og:description',
        content: trs.site.description
      },
      { hid: 'og:image', property: 'og:image', content: trs.site.social_image },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:site', content: '@tn604000' }
    ],
    link: [
      { rel: 'icon', type: 'image/x-icon', href: 'favicon.ico' },
      { rel: 'shortcut icon', type: 'image/x-icon', href: 'favicon.ico' }
    ]
  },
  /*
   ** Customize the progress-bar color
   */
  loading: {
    color: '#c62828',
    height: '5px'
  },
  /*
   ** Global CSS
   */
  css: [],
  /*
   ** Plugins to load before mounting the App
   */
  plugins: [
    { src: '@plugins/i18n' },
    { src: '@plugins/eventBus.js', mode: 'client' },
    { src: '@plugins/analytics.js', mode: 'client' },
    { src: '@plugins/route.js', mode: 'client' }
  ],
  /*
   ** Nuxt.js dev-modules
   */
  buildModules: [['@nuxtjs/vuetify', { treeShake: false }]],
  /*
   ** Nuxt.js modules
   */
  modules: [
    '@nuxtjs/pwa',
    '@nuxtjs/axios',
    '@nuxtjs/markdownit',
    '@nuxtjs/sitemap',
    '@nuxtjs/google-gtag',
    '@nuxtjs/google-fonts',
    'cookie-universal-nuxt'
  ],
  'google-gtag': {
    id: 'G-JHW2E0H1PQ',
    debug: !is_production
  },
  /*
   ** vuetify module configuration
   ** https://github.com/nuxt-community/vuetify-module
   */
  vuetify: {
    customVariables: ['~/assets/variables.scss'],
    theme: {
      dark: false,
      themes: {
        light: {
          primary: themes.light.primary,
          secondary: themes.light.secondary,
          accent: themes.light.accent,
          error: themes.light.error,
          warning: themes.light.warning,
          info: themes.light.info,
          success: themes.light.success
        },
        dark: {
          primary: themes.dark.primary,
          secondary: themes.dark.secondary,
          accent: themes.dark.accent,
          error: themes.dark.error,
          warning: themes.dark.warning,
          info: themes.dark.info,
          success: themes.dark.success
        }
      }
    },
    defaultAssets: {
      font: null,
      icons: 'mdiSvg'
    }
  },
  pwa: {
    manifest: {
      start_url: '/?standalone=true'
    }
  },
  googleFonts: {
    families: {
      'Noto Sans TC': true
    }
  },
  markdownit: {
    preset: 'default',
    linkify: true,
    breaks: false,
    use: ['markdown-it-div', 'markdown-it-attrs'],
    injected: true
  },
  sitemap: {
    path: '/sitemap.xml',
    hostname: trs.site.url,
    routes: [
      {
        url: '/',
        changefreq: 'daily',
        priority: 1,
        lastmod: new Date()
      },
      {
        url: '/links',
        changefreq: 'weekly',
        priority: 0.5,
        lastmod: new Date()
      },
      {
        url: '/feedback',
        changefreq: 'weekly',
        priority: 0.5,
        lastmod: new Date()
      }
    ]
  },
  publicRuntimeConfig: {
    DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID,
    DISCORD_REDIRECT_URI: process.env.DISCORD_REDIRECT_URI,
    DISCORD_API_BASE: process.env.DISCORD_API_BASE
  },
  /*
   ** Build configuration
   */
  build: {
    optimizeCSS: is_production,
    extractCSS: is_production,
    extend(config, ctx) {
      config.module.rules.push({
        test: /\.ya?ml$/,
        use: 'js-yaml-loader'
      });
      // Run ESLint on save
      if (ctx.isDev && ctx.isClient) {
        config.module.rules.push({
          enforce: 'pre',
          test: /\.(js|vue)$/,
          loader: 'eslint-loader',
          exclude: /(node_modules)/
        });
      }
    }
  }
};
