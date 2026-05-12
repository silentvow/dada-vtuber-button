// 從 Vue VNode 樹遞迴萃取純文字
// 用於 v-btn aria-label 從 default slot 取得可讀文字
// 不能用 vnodes.join(''),那會把 VNode 物件變成 "[object Object]" (a11y 失敗)
export function extractText(input: unknown): string {
  if (input == null) return '';
  if (typeof input === 'string' || typeof input === 'number') return String(input);
  if (Array.isArray(input)) return input.map(extractText).join('');
  if (typeof input === 'object') return extractText((input as { children?: unknown }).children);
  return '';
}
