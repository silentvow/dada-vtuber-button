import { defineStore } from 'pinia';

export const useFavoriteStore = defineStore('favorite', {
  state: () => ({
    favorites: [] as string[]
  }),
  getters: {
    // 檢查某個語音 ID 是否在最愛中 (取代舊的 this.$store.getters['getFavorite'].some)
    isFavorite: state => {
      return (voiceId: string) => state.favorites.some(prefix => voiceId.startsWith(prefix));
    }
  },
  actions: {
    addFavorite(voiceId: string) {
      const id = voiceId.slice(0, 13);
      if (!this.favorites.includes(id)) {
        this.favorites.push(id);
      }
    },
    removeFavorite(voiceId: string) {
      const id = voiceId.slice(0, 13);
      this.favorites = this.favorites.filter(f => f !== id);
    }
  },
  persist: true
});
