export default defineNuxtRouteMiddleware((to, from) => {
  // 當發生路由切換時 (例如從首頁切換到最愛頁面)
  if (to.path !== from.path) {
    // 呼叫我們剛才寫的 Pinia store，將正在播放的音效強制停止
    const audioStore = useAudioStore();
    audioStore.stopAll();
  }
});
