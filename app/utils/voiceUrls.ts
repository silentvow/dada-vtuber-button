// 語音檔 URL 解析
// prod 同時回多個 CDN URL,讓 audio store 平行 race(先 canplay 的贏);
// dev 只回本機 /voices/ 一個 URL,不 race(本機沒有 CDN 問題)
//
// 抽到 util 是為了 (1) 可 unit test (注入 isProd) (2) 集中 CDN 設定點
//
// 用多個 CDN 是因為 jsdelivr edge 節點同步不一致,
// 某些邊緣節點還沒同步到最新 commit 就回 404 (HTML) → 觸發 ORB 阻擋
// (statically.io 試過,但會把 audio 當不允許的格式擋掉,所以改走 raw.githubusercontent
//  跟 GitHub Pages 兩個官方來源,任一可用就播)

const JSDELIVR_BASE = 'https://cdn.jsdelivr.net/gh/silentvow/dada-vtuber-button@master/public/voices/';
const RAW_GITHUB_BASE = 'https://raw.githubusercontent.com/silentvow/dada-vtuber-button/master/public/voices/';
const GH_PAGES_BASE = 'https://silentvow.github.io/dada-vtuber-button/public/voices/';
const DEV_BASE = '/voices/';

export function getVoiceUrls(path: string, opts?: { isProd?: boolean }): string[] {
  const isProd = opts?.isProd ?? import.meta.env.PROD;
  if (isProd) {
    return [JSDELIVR_BASE + path, RAW_GITHUB_BASE + path, GH_PAGES_BASE + path];
  }
  return [DEV_BASE + path];
}

// 給 download() 之類「只需要一個 URL」的場景用,取第一個 (主 CDN)
export function getPrimaryVoiceUrl(path: string, opts?: { isProd?: boolean }): string {
  return getVoiceUrls(path, opts)[0];
}
