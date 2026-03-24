import { defineStore } from 'pinia';
import { useSettingsStore } from './settings';

export const useAudioStore = defineStore('audio', {
  state: () => ({
    // 儲存目前正在播放的 Audio 實體
    activeAudios: new Set<HTMLAudioElement>(),
    // 記錄每個按鈕的播放進度 { 'voice-id': 50 }
    progressMap: {} as Record<string, number>,
    // 記錄每個按鈕是否正在播放 { 'voice-id': true }
    playingMap: {} as Record<string, boolean>,

    // 控制面板狀態 (從頁面移過來)
    overlap: false,
    random: false,
    repeat: false,

    // 存放計時器 ID，用來清除進度條更新
    timers: {} as Record<string, ReturnType<typeof setInterval>>
  }),

  actions: {
    play(
      item: any,
      voiceHost: string,
      metaTitle: string,
      fullTitle: string,
      albumTitle: string,
      onRandomNext?: () => void
    ) {
      const settings = useSettingsStore();
      const audioUrl = voiceHost + item.path;

      // 如果不允許重疊，先暫停所有正在播放的
      if (!this.overlap) {
        this.stopAll();
      }

      const audio = new Audio(audioUrl);
      audio.load();

      // 設定 Media Session
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new window.MediaMetadata({
          title: this.overlap ? '重疊播放中' : metaTitle,
          artist: fullTitle,
          album: albumTitle,
          artwork: [{ src: '/img/media-cover.png', sizes: '128x128', type: 'image/png' }]
        });
        navigator.mediaSession.playbackState = 'playing';
      }

      const cleanup = () => {
        this.progressMap[item.id] = 0;
        this.playingMap[item.id] = false;
        clearInterval(this.timers[item.id]);
        this.activeAudios.delete(audio);
      };

      audio.addEventListener('canplay', () => {
        audio.volume = settings.volume * 0.01;
        audio.play();
        this.activeAudios.add(audio);
        this.playingMap[item.id] = true;

        // 設定進度條計時器
        clearInterval(this.timers[item.id]);
        this.timers[item.id] = setInterval(() => {
          const prog = Number(((audio.currentTime / audio.duration) * 100).toFixed(2));
          this.progressMap[item.id] = prog !== Infinity && !isNaN(prog) ? prog : 0;
        }, 50);
      });

      audio.addEventListener('ended', () => {
        if (this.repeat) {
          audio.currentTime = 0;
          audio.play();
        } else if (this.random && onRandomNext) {
          onRandomNext();
        } else {
          cleanup();
        }
      });

      audio.addEventListener('pause', () => {
        cleanup();
        if ('mediaSession' in navigator) {
          navigator.mediaSession.playbackState = 'paused';
        }
      });

      audio.addEventListener('error', () => {
        cleanup();
        const { $i18n } = useNuxtApp();
        useSnackbar().show($i18n.t('action.audio_error'));
      });

      // 綁定自訂的 abort 方法到物件上
      (audio as any).abort_play = () => {
        audio.pause();
        cleanup();
      };
    },

    stopAll() {
      this.activeAudios.forEach(audio => {
        if ((audio as any).abort_play) {
          (audio as any).abort_play();
        }
      });
    },

    toggleOverlap() {
      this.overlap = !this.overlap;
    },
    toggleRandom() {
      this.random = !this.random;
    },
    toggleRepeat() {
      this.repeat = !this.repeat;
    }
  }
});
