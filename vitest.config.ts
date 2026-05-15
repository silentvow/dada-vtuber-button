import { defineConfig } from 'vitest/config';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// pinia 在 prod 會跑到 .prod.cjs (Vuetify SSR 相關),vitest 也要對到同一個 ESM 版本
// 跟 nuxt.config.ts 的 alias 同步
const require$ = createRequire(import.meta.url);
const piniaEsm = resolve(dirname(require$.resolve('pinia/package.json')), 'dist/pinia.mjs');
const projectRoot = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      // 對齊 Nuxt 4 的 alias:~ 指 app/ (srcDir)、~~ 指專案根
      pinia: piniaEsm,
      '~': resolve(projectRoot, 'app'),
      '~~': projectRoot
    }
  },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node'
  }
});
