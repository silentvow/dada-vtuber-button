import { defineStore } from 'pinia';
import { useSettingsStore } from './settings';
import { getVoiceUrls } from '~/utils/voiceUrls';

// 一個正在進行 race 的 audio 取消控制器
interface RaceController {
  abort: () => void;
}

export const useAudioStore = defineStore('audio', {
  state: () => ({
    // 儲存目前正在播放的 Audio 實體 (winners)
    activeAudios: new Set<HTMLAudioElement>(),
    // 儲存正在 race 中的 controllers,讓 stopAll 可以打斷 race
    activeRaces: new Set<RaceController>(),
    // 記錄每個按鈕的播放進度 { 'voice-id': 50 }
    progressMap: {} as Record<string, number>,
    // 記錄每個按鈕是否正在播放 { 'voice-id': true }
    playingMap: {} as Record<string, boolean>,

    // 控制面板狀態
    overlap: false,
    random: false,
    repeat: false,

    // 存放計時器 ID,用來清除進度條更新
    timers: {} as Record<string, ReturnType<typeof setInterval>>
  }),

  actions: {
    // play 不再接受 voiceHost 參數 — URL 由 getVoiceUrls 內部處理 (prod 雙 CDN race,dev 單 URL)
    play(
      item: any,
      metaTitle: string,
      fullTitle: string,
      albumTitle: string,
      onRandomNext?: () => void,
      callbacks?: { onStart?: () => void; onEnd?: () => void; onError?: () => void }
    ) {
      const settings = useSettingsStore();
      const urls = getVoiceUrls(item.path);

      // 如果不允許重疊,先暫停所有正在播放/race 的
      if (!this.overlap) {
        this.stopAll();
      }

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

      // === Race 階段 ===
      // 同時對所有 CDN 發起 audio load,first 'canplay' 贏家成為實際播放對象。
      // 其他輸家被 abort (src='' + load() 中斷下載) 省頻寬。
      // 全部都 error 才視為播放失敗。

      const racers = urls.map(url => new Audio(url));
      let winner: HTMLAudioElement | null = null;
      let aborted = false;
      let started = false;
      let errorCount = 0;

      // 共用 cleanup:winner 結束 (ended/pause/error/abort) 時清狀態
      const cleanup = () => {
        if (!winner) return;
        this.progressMap[item.id] = 0;
        this.playingMap[item.id] = false;
        clearInterval(this.timers[item.id]);
        this.activeAudios.delete(winner);
        if (started) {
          started = false;
          callbacks?.onEnd?.();
        }
      };

      // race controller: stopAll 用它打斷未決勝的 race
      const raceCtl: RaceController = {
        abort: () => {
          aborted = true;
          racers.forEach(a => {
            a.src = '';
            a.load(); // 中斷下載
          });
          cleanup();
        }
      };
      this.activeRaces.add(raceCtl);

      const finishRace = () => {
        this.activeRaces.delete(raceCtl);
      };

      // 宣告贏家 — 第一個 canplay 的 racer 贏
      const declareWinner = (audio: HTMLAudioElement) => {
        if (winner || aborted) return;
        winner = audio;
        finishRace();

        // 中斷其他 racer 下載
        racers.forEach(a => {
          if (a !== winner) {
            a.src = '';
            a.load();
          }
        });

        // 開始實際播放
        audio.volume = settings.volume * 0.01;
        audio.play();
        this.activeAudios.add(audio);
        this.playingMap[item.id] = true;
        started = true;
        callbacks?.onStart?.();

        // 進度條計時器
        clearInterval(this.timers[item.id]);
        this.timers[item.id] = setInterval(() => {
          const prog = Number(((audio.currentTime / audio.duration) * 100).toFixed(2));
          this.progressMap[item.id] = prog !== Infinity && !isNaN(prog) ? prog : 0;
        }, 50);

        // Winner-only listeners
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

        // 中途錯誤 (winner 播一半 CDN 出包):不重試,直接顯示錯誤
        // 重試需要記錄 currentTime + 重新 load 切換 src,複雜度高,ROI 低
        audio.addEventListener('error', () => {
          cleanup();
          callbacks?.onError?.();
          const { $i18n } = useNuxtApp();
          useSnackbar().show($i18n.t('action.audio_error'));
        });

        // 自訂 abort 方法 (給 stopAll 用)
        (audio as any).abort_play = () => {
          audio.pause();
          cleanup();
        };
      };

      // 全部 race 失敗才當作真的失敗
      const onRacerError = () => {
        errorCount++;
        if (errorCount === racers.length && !winner && !aborted) {
          finishRace();
          callbacks?.onError?.();
          const { $i18n } = useNuxtApp();
          useSnackbar().show($i18n.t('action.audio_error'));
        }
      };

      // 對每個 racer 掛 race-only listeners (once,觸發後自動移除)
      racers.forEach(a => {
        a.addEventListener('canplay', () => declareWinner(a), { once: true });
        a.addEventListener('error', onRacerError, { once: true });
        a.load();
      });
    },

    stopAll() {
      // 先打斷 race 中的
      this.activeRaces.forEach(r => r.abort());
      this.activeRaces.clear();
      // 再停 winner audios
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
