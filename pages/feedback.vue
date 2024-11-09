<template>
  <v-layout column justify-center align-center app>
    <v-card class="readme-card">
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
  </v-layout>
</template>
<script>
export default {
  head() {
    return {
      title: this.$t('site.feedback') + ' - ' + this.$t('site.title')
    };
  }
};
</script>
<style lang="css">
.readme-card {
  width: 100%;
  height: calc(100vh - 160px);
  margin-bottom: -150px;
}
</style>
