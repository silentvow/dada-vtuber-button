<template>
  <v-layout column justify-center align-center app>
    <v-flex xs12 sm8 md6 style="min-width: 85%">
      <v-card class="mx-auto" outlined>
        <v-card-title class="headline mb-8">Member Area</v-card-title>

        <v-card-text v-if="loading" style="display: flex; flex-direction: column; align-items: center">
          <v-progress-circular indeterminate color="primary"></v-progress-circular>
          <p class="my-4">Loading...</p>
        </v-card-text>

        <v-card-text v-else-if="error">
          <v-alert type="error" outlined>{{ error }}</v-alert>
          <v-btn v-if="account" large class="mt-4 px-8" color="success" @click="fetchAccountInfo">重新整理</v-btn>
          <v-btn v-else large class="mt-4 px-8" color="success" @click="redirectToDiscordAuth">
            連結 Discord 帳號
          </v-btn>
        </v-card-text>

        <v-card-text v-else>
          <h2 class="text-h6 mb-2">Welcome, {{ account.global_name }}</h2>

          <div v-if="isAuthorized">
            <v-alert type="success" outlined>
              You are authorized to view this page. Welcome to the member area!
            </v-alert>
          </div>
          <div v-else>
            <v-alert type="error" outlined>
              You are not authorized to view this page. Please join @ReliveDaDa youtube member and link to discord
              server.
            </v-alert>
            <v-btn color="success" large class="mt-4 px-8" @click="fetchAccountInfo">重新整理</v-btn>
          </div>

          <v-btn color="error" large class="mt-4 px-8" @click="logout">取消連結</v-btn>
        </v-card-text>
      </v-card>
    </v-flex>
  </v-layout>
</template>

<style lang="scss" scoped>
.v-card {
  margin: 8px auto;
}
</style>
<script>
export default {
  data() {
    return {
      loading: true,
      error: null,
      account: null,
      guilds: []
    };
  },
  computed: {
    isAuthorized() {
      return this.guilds.some(guild => guild.id === '959421169629560892');
    }
  },
  mounted() {
    setTimeout(() => this.fetchAccountInfo(), 1000);
  },
  beforeMount() {
    const hash = window.location.hash;
    if (hash && hash.includes('access_token')) {
      const params = new URLSearchParams(hash.substring(1));
      const token = params.get('access_token');
      if (token) {
        this.$cookies.set('discord_token', token);
        window.location.hash = ''; // Clean up the URL
      }
    }
  },
  methods: {
    async fetchAccountInfo() {
      this.loading = true;
      this.error = null;
      try {
        const token = this.$cookies.get('discord_token');
        if (!token) throw new Error('');

        const headers = { Authorization: `Bearer ${token}` };

        // Fetch the account and guild information
        const [accountRes, guildsRes] = await Promise.all([
          fetch(`${this.$config.DISCORD_API_BASE}/users/@me`, { headers }).then(res => res.json()),
          fetch(`${this.$config.DISCORD_API_BASE}/users/@me/guilds`, { headers }).then(res => res.json())
        ]);

        this.account = accountRes;
        this.guilds = guildsRes;
        this.loading = false;
      } catch (err) {
        this.error = err.message || 'Authorization required';
        this.loading = false;
      }
    },
    redirectToDiscordAuth() {
      const discordAuthUrl = `https://discord.com/oauth2/authorize?client_id=${
        this.$config.DISCORD_CLIENT_ID
      }&redirect_uri=${encodeURIComponent(
        this.$config.DISCORD_REDIRECT_URI
      )}&response_type=token&scope=identify%20guilds`;
      window.location.href = discordAuthUrl;
    },
    logout() {
      this.$cookies.remove('discord_token');
      this.account = null;
      this.guilds = [];
      this.error = 'Logged out. Please re-authenticate.';
    }
  }
};
</script>
