// 過濾語音群組 — 年份 + 文字搜尋
// 搜尋目標:三語系 description + voice name + group 名 (case-insensitive)
// 文字命中採 includes (簡單字串包含,不做 fuzzy 避免複雜化)
// 抽到 util 是為了:1) 可被 unit test 2) index.vue 邏輯保持簡潔

type VoiceDescription = { zh?: string; ja?: string; en?: string };

type Voice = {
  id: string;
  name: string;
  description: VoiceDescription;
  year?: string;
  [key: string]: any;
};

type VoiceGroup = {
  id?: string;
  group_name?: string;
  group_description?: VoiceDescription;
  voice_list: Voice[];
  [key: string]: any;
};

export type FilterOptions = {
  year?: string; // 'All' 或具體年份
  query?: string; // 使用者輸入的搜尋字串
};

function voiceMatchesQuery(voice: Voice, lcQuery: string): boolean {
  if (!lcQuery) return true;
  const haystack = [
    voice.name,
    voice.description?.zh,
    voice.description?.ja,
    voice.description?.en
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(lcQuery);
}

function groupMatchesQuery(group: VoiceGroup, lcQuery: string): boolean {
  if (!lcQuery) return false;
  const haystack = [
    group.group_name,
    group.group_description?.zh,
    group.group_description?.ja,
    group.group_description?.en
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(lcQuery);
}

export function filterVoiceGroups(groups: VoiceGroup[], opts: FilterOptions = {}): VoiceGroup[] {
  const lcQuery = (opts.query || '').trim().toLowerCase();
  const year = opts.year || 'All';

  return groups
    .map(group => {
      // 群組標題若命中,該群組所有 (符合年份的) 語音都保留
      const groupHits = groupMatchesQuery(group, lcQuery);

      const filteredVoices = group.voice_list.filter(voice => {
        if (year !== 'All' && voice.year !== year) return false;
        if (!lcQuery) return true;
        // 群組標題命中,語音不用再過濾文字
        if (groupHits) return true;
        return voiceMatchesQuery(voice, lcQuery);
      });

      return { ...group, voice_list: filteredVoices };
    })
    .filter(group => group.voice_list.length > 0);
}
