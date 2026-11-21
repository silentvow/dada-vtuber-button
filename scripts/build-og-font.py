#!/usr/bin/env python3
"""產生 OG 圖用的 CJK 字型子集 (public/fonts/og/*.ttf)。

為什麼需要:OG 圖由 satori 在 build 時算圖,它只吃 ttf/otf/woff,而且預設只有拉丁字型,
中日文會變成 NO GLYPH 方塊。完整的 Noto Sans CJK 有 10MB+,所以只切出站上實際用到的字。

什麼時候要重跑:voices.json 新增 / 修改了分類名稱 (group_description),出現新字時。
`pnpm test:unit` 裡的 og-font-chars 測試會在字不夠時失敗並提醒。

用法 (來源是 OFL 授權的 Noto Sans TC / JP variable font,可從 Google Fonts 下載):
  pip install fonttools brotli
  python scripts/build-og-font.py --tc <NotoSansTC-VF.ttf> --jp <NotoSansJP-VF.ttf>
"""
import argparse
import json
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / 'public' / 'fonts' / 'og'
CHARS_FILE = ROOT / 'scripts' / 'og-font-chars.txt'


def collect_chars() -> str:
    chars = set()
    # ASCII 可見字元 (數字、英文站名、標點)
    chars.update(chr(c) for c in range(0x20, 0x7F))
    chars.update('：，、。「」『』（）！？～—・')
    voices = json.loads((ROOT / 'public' / 'voices.json').read_text(encoding='utf-8'))
    for group in voices['groups']:
        for text in group['group_description'].values():
            chars.update(text)
    # OG 圖上會出現的固定文案:站名、摘要句
    for lang in ('default', 'ja', 'en'):
        locale = json.loads((ROOT / 'i18n' / 'locales' / f'{lang}.json').read_text(encoding='utf-8'))
        chars.update(locale['site']['title'])
        chars.update(locale['group']['summary'])
    return ''.join(sorted(chars))


def build(src: str, dest: str, chars: str) -> None:
    font = TTFont(src)
    if 'fvar' in font:
        font = instancer.instantiateVariableFont(font, {'wght': 700})
    opts = subset.Options()
    opts.layout_features = ['*']
    opts.name_IDs = ['*']
    opts.notdef_outline = True
    sub = subset.Subsetter(opts)
    sub.populate(text=chars)
    sub.subset(font)
    font.save(dest)
    print(f'{dest}: {Path(dest).stat().st_size // 1024} KB')


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--tc', required=True)
    parser.add_argument('--jp', required=True)
    args = parser.parse_args()

    chars = collect_chars()
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    CHARS_FILE.write_text(chars + '\n', encoding='utf-8')
    print(f'{len(chars)} characters')
    build(args.tc, str(OUT_DIR / 'NotoSansTC-Bold-subset.ttf'), chars)
    build(args.jp, str(OUT_DIR / 'NotoSansJP-Bold-subset.ttf'), chars)


if __name__ == '__main__':
    main()
