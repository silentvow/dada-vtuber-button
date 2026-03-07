import { defineStore } from 'pinia';

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    dark: true, // 預設為深色模式
    volume: 100, // 預設音量
    lang: 'zh' // 預設語系
  }),
  actions: {
    setDark(isDark: boolean) {
      this.dark = isDark;
    },
    setVolume(vol: number) {
      this.volume = vol;
    },
    setLang(lang: string) {
      this.lang = lang;
    }
  },
  persist: true
});
