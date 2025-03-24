import yt_dlp
import pandas as pd
from datetime import datetime
import os

# === 檔案路徑 ===
INPUT_CSV = "logs/input.csv"
CACHE_CSV = "logs/cache.csv"
OUTPUT_CSV = "logs/output.csv"

# === 讀取輸入檔案 ===
input_df = pd.read_csv(INPUT_CSV, header=None, names=["URL"])
input_df["URL"] = input_df["URL"].str.strip()

# === 讀取或初始化快取 ===
if os.path.exists(CACHE_CSV):
    cache_df = pd.read_csv(CACHE_CSV)
else:
    cache_df = pd.DataFrame(columns=["URL", "標題", "開始直播時間"])

# 快取轉成 dict，方便查詢
cache_dict = dict(zip(cache_df["URL"], cache_df[["標題", "開始直播時間"]].to_dict(orient="records")))

# === yt-dlp 設定 ===
ydl_opts = {
    'quiet': True,
    'skip_download': True,
}

results = []

with yt_dlp.YoutubeDL(ydl_opts) as ydl:
    for url in input_df["URL"]:
        if url in cache_dict:
            info = cache_dict[url]
        else:
            try:
                meta = ydl.extract_info(url, download=False)
                title = meta.get("title", "")
                start_time = (
                    meta.get("release_timestamp")
                    or meta.get("availability_start_time")
                    or meta.get("live_start_time")
                    or meta.get("upload_date")
                )

                if isinstance(start_time, int):
                    start_time = datetime.utcfromtimestamp(start_time).isoformat()
                elif isinstance(start_time, str) and len(start_time) == 8:
                    start_time = datetime.strptime(start_time, "%Y%m%d").isoformat()

                info = {"標題": title, "開始直播時間": start_time}
                cache_dict[url] = info  # 更新快取字典
                print(f"Title: {title}")

            except Exception as e:
                info = {"標題": f"錯誤: {str(e)}", "開始直播時間": None}
                cache_dict[url] = info

        results.append({
            "URL": url,
            "標題": info["標題"],
            "開始直播時間": info["開始直播時間"]
        })

# === 輸出結果 ===
output_df = pd.DataFrame(results)
output_df.to_csv(OUTPUT_CSV, index=False, encoding="utf-8-sig")
print(f"已儲存處理結果到 {OUTPUT_CSV}")

# === 更新快取 ===
new_cache_df = pd.DataFrame([
    {"URL": url, "標題": data["標題"], "開始直播時間": data["開始直播時間"]}
    for url, data in cache_dict.items()
])
new_cache_df.to_csv(CACHE_CSV, index=False, encoding="utf-8-sig")
print(f"已更新快取到 {CACHE_CSV}")
