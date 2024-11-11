<template>
  <v-app>
    <v-navigation-drawer v-model="drawer" :mobile-breakpoint="1024" class="elevation-3 full-height" fixed app>
      <!--
      <template v-slot:img>
        <v-img />
        <div
          class="nav-darwer-overlay"
          :class="$vuetify.theme.dark ? 'nav-darwer-overlay-dark' : 'nav-darwer-overlay-light'"
        />
      </template>
      -->
      <v-list style="padding-top: 0">
        <v-list-item to="/" router exact dense>
          <v-list-item-action>
            <v-icon>{{ icons.apps }}</v-icon>
          </v-list-item-action>
          <v-list-item-content>
            <v-list-item-title>{{ $t('site.index') }}</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
        <v-list-item
          v-for="(item, i) in $t('navigator.items')"
          :key="i"
          :href="item.to"
          target="_blank"
          rel="noreferrer"
          router
          exact
          dense
        >
          <v-list-item-action>
            <v-img :src="item.icon" style="width: 24px" />
          </v-list-item-action>
          <v-list-item-content>
            <v-list-item-title v-text="item.title" />
          </v-list-item-content>
        </v-list-item>
      </v-list>
      <v-divider />
      <v-list>
        <!-- 友情链接 -->
        <!--
        <v-list-item dense to="/links" router exact>
          <v-list-item-action>
            <v-icon>{{ icons.play_list_star }}</v-icon>
          </v-list-item-action>
          <v-list-item-content>
            <v-list-item-title>{{ $t('site.links') }}</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
        -->
        <v-list-item dense to="/favorite" router exact>
          <v-list-item-action>
            <v-icon>{{ icons.heart }}</v-icon>
          </v-list-item-action>
          <v-list-item-content>
            <v-list-item-title>{{ $t('site.favorite') }}</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
        <v-list-item dense to="/feedback" router exact>
          <v-list-item-action>
            <v-icon>{{ icons.msg_question }}</v-icon>
          </v-list-item-action>
          <v-list-item-content>
            <v-list-item-title>{{ $t('site.feedback') }}</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
        <v-list-item dense to="/member" router exact>
          <v-list-item-action>
            <v-icon>{{ icons.account_group }}</v-icon>
          </v-list-item-action>
          <v-list-item-content>
            <v-list-item-title>{{ $t('member.member_area') }}</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
      </v-list>

      <template v-slot:append>
        <v-img src="/img/woman.png" style="width: 100%; height: auto" />
      </template>
    </v-navigation-drawer>
    <v-app-bar dense class="primary white--text" app>
      <v-app-bar-nav-icon class="white--text" @click.stop="drawer = !drawer" />
      <v-toolbar-title v-text="$t('site.title')" />
      <v-img src="/icon.png" style="max-width: 24px; margin-left: 6px" />
      <v-spacer />
      <v-menu offset-y>
        <template v-slot:activator="{ on, attrs }">
          <v-btn icon plain class="white--text" v-bind="attrs" v-on="on">
            <v-icon>{{ icons.volume }}</v-icon>
          </v-btn>
        </template>
        <v-layout flex flex-row class="pa-2 volume-menu">
          <v-icon color="#c62828">{{ icons.volumeLow }}</v-icon>
          <v-slider
            v-model="volume"
            :min="0"
            :max="100"
            hide-details
            model-value="volume"
            track-color="#bdbdbd"
            track-fill-color="#ff8a80"
            @change="onVolumeChange"
          ></v-slider>
          <v-icon color="#c62828">{{ icons.volume }}</v-icon>
        </v-layout>
      </v-menu>
      <v-tooltip bottom>
        <template v-slot:activator="{ on }">
          <v-btn icon plain class="white--text" @click="switch_dark()" v-on="on">
            <v-icon>{{ icons.brightness }}</v-icon>
          </v-btn>
        </template>
        <span>{{ $t('site.switch_dark_mode') }}</span>
      </v-tooltip>
      <v-menu offset-y>
        <template v-slot:activator="{ on: menu }">
          <v-tooltip bottom>
            <template v-slot:activator="{ on: tooltip }">
              <v-btn icon plain class="white--text" v-on="{ ...tooltip, ...menu }">
                <v-icon>{{ icons.translate }}</v-icon>
              </v-btn>
            </template>
            <span>{{ $t('site.switch_language') }}</span>
          </v-tooltip>
        </template>
        <v-list>
          <v-list-item id="lang-switch-zh" @click="switch_lang('zh')">
            <v-list-item-title>中文</v-list-item-title>
          </v-list-item>
          <v-list-item id="lang-switch-ja" @click="switch_lang('ja')">
            <v-list-item-title>日本語</v-list-item-title>
          </v-list-item>
          <v-list-item id="lang-switch-en" @click="switch_lang('en')">
            <v-list-item-title>English</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </v-app-bar>
    <v-main>
      <v-container class="page">
        <nuxt />
      </v-container>
      <v-footer :fixed="false" class="footer">
        <div>
          <div style="vertical-align: middle">
            <span>&copy; {{ new Date().getFullYear() }} </span>
            <span>
              <a :href="$t('site.footer.author_link')" target="_blank" rel="noreferrer">
                {{ $t('site.footer.author') }}
              </a>
            </span>
            <span>&nbsp;|&nbsp;</span>
            <span>
              <a href="/privacy">Privacy</a>
            </span>
            <v-btn
              v-if="$t('site.footer.repo_link') === 'no_display'"
              icon
              :href="$t('site.footer.repo_link')"
              target="_blank"
              style="vertical-align: middle"
              rel="noreferrer"
            >
              <v-icon>{{ icons.github }}</v-icon>
            </v-btn>
          </div>
          <div>
            <p>{{ $t('site.footer.content') }}</p>
          </div>
        </div>
      </v-footer>
    </v-main>
  </v-app>
</template>

<style lang="scss">
:root {
  --vh: 1vh;
}

$blur-function: blur(3px);
.v-application {
  html[lang='en'] & {
    font-family: $en-body-fonts;
  }
  html[lang='ja'] & {
    font-family: $ja-body-fonts;
  }
  html[lang='zh'] & {
    font-family: $zh-body-fonts;
  }
  background-repeat: repeat;
}
.v-application--wrap {
  min-height: calc(var(--vh, 1vh) * 100) !important;
}
.full-height {
  height: 100vh;
  height: calc(var(--vh, 1vh) * 100);
  max-height: -webkit-fill-available;
}

.theme--light.v-application {
  background-image: url('/img/bg/pink.jpg');
}
.theme--dark.v-application {
  background-image: url('/img/bg/dark-red.jpg');
}

.nav-drawer-img {
  width: auto;
  height: 100%;
  /*
  -webkit-filter: $blur-function;
  -moz-filter: $blur-function;
  -ms-filter: $blur-function;
  filter: $blur-function;
   */
}
.nav-darwer-overlay {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  height: 100%;
  width: 100%;
}
.nav-darwer-overlay-light {
  background-color: rgba(255, 255, 255, 0.8);
}
.nav-darwer-overlay-dark {
  background-color: rgba(0, 0, 0, 0.8);
}
a {
  text-decoration: none;
}
.volume-menu {
  background-color: #fff;
  width: 256px;
  margin-top: 0px;
  flex-direction: row;
  align-items: center;
  overflow: hidden;
}
.page {
  box-sizing: border-box;
  min-height: 100%;
  padding-bottom: 150px;
}
.footer {
  position: absolute;
  bottom: 0;
  width: 100%;
}
.footer p {
  margin: 0;
}
</style>

<script>
import {
  mdiAccountGroup,
  mdiApps,
  mdiCodeTags,
  mdiBrightness2,
  mdiHeartOutline,
  mdiMessageAlertOutline,
  mdiTranslate,
  mdiGithub,
  mdiNewspaper,
  mdiAlphaBBox,
  mdiPlaylistStar,
  mdiCommentAccountOutline,
  mdiVolumeHigh,
  mdiVolumeLow
} from '@mdi/js';
//import themes from '../assets/themes.js';

export default {
  data() {
    return {
      icons: {
        apps: mdiApps,
        account_group: mdiAccountGroup,
        code_tags: mdiCodeTags,
        heart: mdiHeartOutline,
        msg_question: mdiMessageAlertOutline,
        brightness: mdiBrightness2,
        translate: mdiTranslate,
        github: mdiGithub,
        newspaper: mdiNewspaper,
        alpha_b_box: mdiAlphaBBox,
        play_list_star: mdiPlaylistStar,
        account: mdiCommentAccountOutline,
        volume: mdiVolumeHigh,
        volumeLow: mdiVolumeLow
      },
      drawer: false,
      fixed: false
    };
  },
  computed: {
    current_locale() {
      return this.$i18n.locale;
    },
    volume() {
      return this.$store.state.volume;
    }
  },
  mounted() {
    // First we get the viewport height and we multiply it by 1% to get a value for a vh unit
    const vh = window.innerHeight * 0.01;
    // Then we set the value in the --vh custom property to the root of the document
    document.documentElement.style.setProperty('--vh', `${vh}px`);

    // Update on resize and orientation change
    window.addEventListener('resize', () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    });

    this.$vuetify.theme.dark = this.$store.state.dark === 'true';
    if (window.innerWidth >= 1024) {
      this.drawer = true;
    }
  },
  methods: {
    switch_dark() {
      this.$vuetify.theme.dark = !this.$vuetify.theme.dark;
      this.$store.commit('SET_DARK', this.$vuetify.theme.dark);
    },
    switch_lang(lang) {
      console.log('switching to ' + lang);
      this.$store.commit('SET_LANG', lang);
      this.$i18n.locale = lang;
    },
    onVolumeChange(value) {
      this.$store.commit('SET_VOLUME', value);
    }
  },
  head() {
    return {
      htmlAttrs: {
        lang: this.current_locale
      }
    };
  }
};
</script>
