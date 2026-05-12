import { describe, it, expect } from 'vitest';
import Ajv from 'ajv';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(__dirname, '../..');
const ajv = new Ajv({ allErrors: true });

const schema = JSON.parse(readFileSync(resolve(root, 'tests/schemas/voices.schema.json'), 'utf-8'));
const validate = ajv.compile(schema);

describe('voices.json schema validation', () => {
  it('voices.json conforms to schema (937 voices, 52 groups, 三語系 description 齊全)', () => {
    const data = JSON.parse(readFileSync(resolve(root, 'public/voices.json'), 'utf-8'));
    const ok = validate(data);
    if (!ok) {
      // 失敗時把所有錯誤印出來給開發者看清楚是哪筆資料壞了
      console.error('schema errors:', JSON.stringify(validate.errors, null, 2));
    }
    expect(ok).toBe(true);
  });

  it('dc_voices.json conforms to schema', () => {
    const data = JSON.parse(readFileSync(resolve(root, 'public/dc_voices.json'), 'utf-8'));
    const ok = validate(data);
    if (!ok) {
      console.error('dc_voices schema errors:', JSON.stringify(validate.errors, null, 2));
    }
    expect(ok).toBe(true);
  });
});
