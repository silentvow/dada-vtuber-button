<template>
  <v-layout column justify-center align-stretch app>
    <v-flex xs12 sm8 md6>
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
    </v-flex>
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
.v-card {
  margin: 8px auto;
}

.readme-card {
  width: 100%;
  height: calc(100vh - 160px);
}
</style>
