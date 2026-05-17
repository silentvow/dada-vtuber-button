# Onboarding — 灰妲語音博物館 (DaDa Voice Museum)

> Quick context for the next Claude session. Read this first before doing anything.

## 一句話介紹

Nuxt 4 SSG Vtuber 粉絲網站 — 收藏台 V「灰妲」的 ~937 條語音剪輯,部署在 Vercel。
i18n 三語系 (zh-TW default / ja / en)。

## Tech stack

- **Nuxt 4** + Vue 3 + Vite
- **Vuetify 3** (預設 dark theme,光暗都支援)
- **Pinia** stores + `@pinia-plugin-persistedstate/nuxt`
- **Vercel** static + serverless functions (Nitro preset `vercel`)
- **Testing**: Vitest (unit) + Playwright (e2e) + axe (a11y)
- 套件管理: **pnpm** (不要用 npm/yarn)

## 重要 PR 脈絡 (近期)

| PR | 主題 | 關鍵 |
|---|---|---|
| PR15 | `/compose` 語音編曲頁 (sequential play) | Pinia composer store, vuedraggable, 50 items 上限 |
| PR16 | `/soundboard` 實況主工具 | 9 個 hotkey slots, drag-to-pin, keyboard 1-9 |
| PR17 | `/api/dc_voices` 404 修復 | member.vue 改 fetch `/dc_voices.json` 靜態檔 |
| **PR18** | **Discord OAuth Code Grant + refresh token** | **改 nitro preset `static` → `vercel`** |
| PR19 | member voice list 修復 | useAsyncData 在 ssr:false+vercel+SPA 拿到空 `{}`,改直接 import JSON |
| PR20 (open) | compose light mode 配色 | Vuetify CSS vars (`--v-theme-surface` 等) |

## 必知 Gotchas (踩過的坑)

### 1. Vuetify utility 名稱

- **`ga-N` 不是 `gap-N`** (跟 `ma-`/`pa-` 一致兩字首)。寫錯 silently 失效。
- 全 `me-N` (margin-end) 也比 `mr-N` 對 (RTL 友善)。

### 2. Build output 位置

切換到 nitro preset `vercel` 後,build output **不再在 `.output/public/`**,而是 `.vercel/output/static/`:
- `pnpm generate` 跟 `pnpm build` 都會輸出到 `.vercel/output/static/`
- `playwright.config.ts` 已指到新路徑
- 切換 preset 後**一定要清掉舊 build cache** (`rm -rf .output .vercel .nuxt node_modules/.cache/nuxt`),不然 chunk 混亂會出怪 bug

### 3. Pinia persist 預設用 cookies

`@pinia-plugin-persistedstate/nuxt` 預設 storage 是 **cookies** (SSR-friendly),不是 localStorage:
- E2E test 重置要 `await context.clearCookies()`,不是 `localStorage.clear()`
- Cookies 上限 ~4KB,塞太多 (例如 50 個 UUID + 描述) 會 `Invalid cookie fields` error
- e2e 預先注入 state 用 `context.addCookies([{ name, value: encodeURIComponent(JSON.stringify(...)), url }])`

### 4. SSG prerender + ssr:false page + cookie persist → hydration mismatch

`/soundboard` 跟 `/compose` 都遇過。prerender 階段 cookie 不存在 → SSR 用預設 state 渲染 → client hydrate 後 cookie 有東西 → Vue class 不更新 → 出現 element 同時有 `-empty` class 跟 voice 名稱的怪現象。

**解法**: 把依賴 cookie state 的區塊包 `<ClientOnly>`,fallback 用同樣 layout 的 placeholder 撐版面避免閃爍。

### 5. useAsyncData 在 ssr:false + vercel preset + SPA nav 路徑會拿不到 data

PR19 花了一小時 debug 沒找到 root cause。`useAsyncData('xxx', () => $fetch('/xxx.json'))` 在從首頁 drawer 點進去的情境拿到空 `{}`,直接打 URL OK。

**解法**: 直接 `import data from '~~/public/xxx.json'`,Vite 內聯進 chunk。

### 6. Discord OAuth 必須 server-side

Discord 不支援 PKCE,只有 Implicit Grant (沒 refresh token) 跟 Authorization Code Grant (要 `client_secret`)。`client_secret` 絕對不能放 client bundle。所以 PR18 把整站從純 SSG 改成 SSG+serverless (nitro preset `vercel`)。

**Vercel env vars** 必設:
- `DISCORD_CLIENT_SECRET` (server-only,Production/Preview/Dev 都要)
- 其他 `DISCORD_CLIENT_ID` / `DISCORD_REDIRECT_URI` / `DISCORD_API_BASE` 是 public,在 `runtimeConfig.public`

### 7. 硬編碼顏色會壞 light mode

`compose.vue` 一開始全用寫死的暗色,PR20 才修。**永遠用 Vuetify CSS variables**:
- `rgb(var(--v-theme-surface))` — 不透明 surface (dark=#212121, light=#fff)
- `rgb(var(--v-theme-surface-light))` — 比 surface 高一階
- `rgba(var(--v-theme-on-surface), 0.04)` — on-surface 低 alpha overlay (做 tint 用,自動反向)
- `rgb(var(--v-theme-primary))` — 主色 (兩 mode 都紅)

如果**真的需要 theme-specific**:
```css
.v-theme--dark .my-class { ... }
.v-theme--light .my-class { ... }
```

## 重要 components / 設計慣例

### VoiceBtn (`app/components/VoiceBtn.vue`)

語音按鈕的核心元件,三種 mode:
- 預設 (`from-youtube=false`): 單顆按鈕,emit `on-play`
- `from-youtube=true`: btn-group with 主按鈕 + `≡` 選單 (like/youtube/download)
- `add-mode=true` (PR18): btn-group with 主按鈕 + `+` 按鈕 (emit `on-add`,給 compose 頁用)

### VoiceListWithSearch (`app/components/VoiceListWithSearch.vue`)

首頁、compose 共用的「搜尋 + 年份 chip + group expansion panels」元件。提供 `voice` slot 給呼叫端決定每條 voice 怎麼 render。

### 設計慣例

- **功能按鈕**: `rounded="lg"` + outlined variant (或 elevated,**不要 tonal**) + icon+文字組合
- **計數 / status chip**: `variant="text"` (純文字,沒填充沒邊框)
- **拖曳排序**: `vuedraggable@^4`
- **音檔 race**: 3 個 CDN parallel race (jsdelivr / raw.github / GitHub Pages),哪個先 `canplay` 用哪個。AudioStore 處理。

## 檔案結構

```
app/
  pages/         /, /favorite, /compose, /challenge, /feedback, /privacy, /member, /soundboard
  components/    VoiceBtn, VoiceListWithSearch
  layouts/       default.vue (主要), soundboard.vue (minimal,無 drawer)
  stores/        settings, audio (CDN race), favorite, composer, soundboard
  utils/         filterVoiceGroups, pickRandomVoice, extractText, voiceUrls
  composables/   useSnackbar
server/
  api/           voices.get.ts, discord/{token,refresh,revoke}.post.ts
  utils/         discord.ts (OAuth helpers, 注入式 fetcher 可 unit test)
  plugins/       defer-entry-css.ts (deferred CSS optimization)
i18n/locales/    default.json (zh-TW), ja.json, en.json
public/          voices.json, dc_voices.json (大 JSON 直接 import 用)
tests/
  unit/          composerStore, soundboardStore, discordOAuth, voiceUrls, ...
  e2e/           flows, compose, soundboard, member, a11y, seo, ...
```

## Commands

```bash
# Dev
pnpm dev                    # localhost:3000

# Build
pnpm generate               # static-ish build → .vercel/output/static/ (含 functions)
pnpm build                  # 同上 (跟 generate 在 vercel preset 下沒差別)

# Test
pnpm test:unit              # Vitest
pnpm test:e2e               # Playwright (會自動 spin up serve)
pnpm lint                   # ESLint (./app)
pnpm test                   # unit + generate + e2e

# Build cache 出問題時 (例如切換 preset 後)
rm -rf .output .vercel .nuxt node_modules/.cache/nuxt
```

## Workflow 慣例

1. **永遠開新 branch** (`fix/...` 或 `feat/...`),不要直接動 master
2. **commit 前跑全套**: `pnpm lint && pnpm test:unit && pnpm generate && pnpm test:e2e`
3. **PR description 寫詳細的 root cause + fix**, 給未來 debug 用
4. **使用者習慣 zh-TW + technical 語氣**, 不要過度客氣
5. **使用者 merge 完會說「merge 了 回 master」** → `git checkout master && git pull && git branch -d <branch>`

## 已知未做的 follow-up

- favorite.vue / member.vue 還有 `gap-2` 寫法 (但 local CSS 蓋過去所以有效),沒清乾淨
- Pinia token cookies 沒 HttpOnly (PR18 留的 TODO,需要 server set-cookie 重構)
- /member 直接 URL 進 (不是 SPA 導航) 在 Vercel 上可能 404 (in nitro ignore)
- E2E 沒覆蓋 favorite / feedback / privacy / member 的互動 (只覆蓋 nav)

## 使用者風格

- 中文,簡潔有效率
- 不喜歡過度解釋,直接給結論 + 動手
- 喜歡看 root cause 分析 (但不要寫太長)
- 不喜歡無謂的 emoji 跟 marketing 詞彙

---

最後 update: PR20 open (compose light mode colors)。master 在 `1b16451`(PR19 merged)。
