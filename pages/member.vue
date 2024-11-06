<template>
  <v-container>
    <v-card class="mx-auto" max-width="500" outlined>
      <v-card-title class="justify-center">Member Page</v-card-title>

      <v-card-text v-if="loading">
        <v-progress-circular indeterminate color="primary"></v-progress-circular>
        <p>Loading...</p>
      </v-card-text>

      <v-card-text v-else-if="error">
        <v-alert type="error" outlined>{{ error }}</v-alert>
        <v-btn color="primary" @click="redirectToDiscordAuth">Authorize with Discord</v-btn>
      </v-card-text>

      <v-card-text v-else>
        <v-avatar class="mb-4" size="64">
          <img :src="account.avatar_url" alt="User avatar" />
        </v-avatar>
        <h2 class="text-h6 mb-2">Welcome, {{ account.username }}</h2>

        <v-list>
          <v-subheader>Subscribed Guilds</v-subheader>
          <v-list-item v-for="guild in guilds" :key="guild.id">
            <v-list-item-content>{{ guild.name }}</v-list-item-content>
          </v-list-item>
        </v-list>

        <v-btn color="error" class="mt-4" @click="logout">Logout</v-btn>
      </v-card-text>
    </v-card>
  </v-container>
</template>

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
        // this.fetchAccountInfo(); // Fetch account info with the new token
      }
    }
  },
  methods: {
    async fetchAccountInfo() {
      this.loading = true;
      this.error = null;
      try {
        const token = this.$cookies.get('discord_token');
        if (!token) throw new Error('No auth token found');

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
