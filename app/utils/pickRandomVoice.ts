// 從 voice groups 隨機挑一個 voice,回傳 { group, voice }
// 抽到 util 是為了 (1) 可 unit test (mock Math.random) (2) 邏輯集中
//
// 回傳含 group 是為了讓呼叫端可以顯示「播放中:類別 - 名稱」之類 UI feedback
//
// 使用兩段隨機:先選 group 再選 voice。注意這「不是」純粹的均勻隨機 —
// 小群組裡的 voice 被選中機率比大群組裡的高。但語意上「先挑類別再挑語音」
// 對使用者來說更有變化,實務上 acceptable trade-off。

type Voice = { id: string; name: string; description?: { zh?: string; ja?: string; en?: string }; [key: string]: any };
type VoiceGroup = {
  voice_list: Voice[];
  group_name?: string;
  group_description?: { zh?: string; ja?: string; en?: string };
  [key: string]: any;
};

export type RandomPick = { group: VoiceGroup; voice: Voice };

export function pickRandomVoice(
  groups: VoiceGroup[] | undefined | null,
  rng: () => number = Math.random
): RandomPick | null {
  if (!groups?.length) return null;

  // 過濾掉空群組,避免選到空 voice_list 噴錯
  const nonEmpty = groups.filter(g => g?.voice_list?.length);
  if (!nonEmpty.length) return null;

  const group = nonEmpty[Math.floor(rng() * nonEmpty.length)];
  const voice = group.voice_list[Math.floor(rng() * group.voice_list.length)];
  return { group, voice };
}
