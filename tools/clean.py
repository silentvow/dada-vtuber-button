import pandas as pd

# 讀取 output.csv
df = pd.read_csv("logs/output.csv")

# 移除 URL 欄位
if "URL" in df.columns:
    df = df.drop(columns=["URL"])

# 輸出成 TSV 格式（Tab-separated）
df.to_csv("logs/output_clean.tsv", sep="\t", index=False, encoding="utf-8-sig")

print("✅ 已輸出為 output_clean.tsv，且已移除 URL 欄位")