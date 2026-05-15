<template>
  <!-- Minimal layout 給 /soundboard 用 — 沒 drawer / 沒 app-bar / 沒 footer
       v-app 還是要保留,Vuetify 元件需要 theme provider。 -->
  <v-app>
    <v-main class="soundboard-main">
      <slot />
    </v-main>
  </v-app>
</template>

<style scoped>
.soundboard-main {
  /* 蓋掉 critical CSS 的 padding-top: 48px (那是預設 layout 給 app-bar 留的空間) */
  padding-top: 0 !important;
  padding-left: 0 !important;
}
</style>
