export const state = () => ({
  voiceFavorite: [],
  volume: 100,
  locales: ['en', 'ja', 'zh'],
  locale: 'zh',
  dark: false
});

export const getters = {
  getFavorite(state) {
    return state.voiceFavorite;
  }
};

export const mutations = {
  ADD_VOICE_FAVORITE(state, voice) {
    state.voiceFavorite.push(voice);
    localStorage.setItem('voiceFavorite', JSON.stringify(state.voiceFavorite));
  },
  REMOVE_VOICE_FAVORITE(state, voice) {
    state.voiceFavorite = state.voiceFavorite.filter(v => v !== voice);
    localStorage.setItem('voiceFavorite', JSON.stringify(state.voiceFavorite));
  },
  SET_VOICE_FAVORITE(state, voiceFavorite) {
    state.voiceFavorite = voiceFavorite;
    localStorage.setItem('voiceFavorite', JSON.stringify(state.voiceFavorite));
  },
  SET_CHALLENGE_DICT(state, challengeDict) {
    state.challengeDict = challengeDict;
    localStorage.setItem('challengeDict', JSON.stringify(state.challengeDict));
  },
  SET_VOLUME(state, volume) {
    state.volume = volume;
    localStorage.setItem('volume', state.volume);
  },
  SET_LANG(state, locale) {
    if (state.locales.includes(locale)) {
      state.locale = locale;
      localStorage.setItem('locale', state.locale);
    }
  },
  SET_DARK(state, dark) {
    state.dark = dark;
    localStorage.setItem('dark', state.dark);
  }
};
