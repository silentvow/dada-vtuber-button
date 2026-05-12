import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname_local = dirname(fileURLToPath(import.meta.url));

// 抽 3 個 voice file 確認 CDN (jsdelivr) 上檔案真的存在
// 抓的不是頁面是 GitHub-hosted CDN,網路問題會造成 flake,所以限縮抽樣 + 給較大 timeout
const voices = JSON.parse(readFileSync(resolve(__dirname_local, '../../public/voices.json'), 'utf-8'));
const allPaths = voices.groups.flatMap((g: any) => g.voice_list.map((v: any) => v.path));

// 抽 3 個 (首/中/末)
const samples = [allPaths[0], allPaths[Math.floor(allPaths.length / 2)], allPaths[allPaths.length - 1]];

test.describe.configure({ retries: 2 }); // jsdelivr 偶爾會 throttle 或 cold cache 慢

test.describe('CDN voice file availability', () => {
  test.setTimeout(30000);

  for (const path of samples) {
    test(`CDN 200 for ${path.split('/').pop()}`, async ({ request }) => {
      const url = `https://cdn.jsdelivr.net/gh/silentvow/dada-vtuber-button@master/public/voices/${path}`;
      // Range request 只拿前 1KB,加速 + 避免 HEAD 被 throttle
      const res = await request.get(url, { headers: { Range: 'bytes=0-1023' } });
      expect([200, 206], `${url} 應該回 200 或 206`).toContain(res.status());
    });
  }
});
