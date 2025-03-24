import pandas as pd
import hashlib
import json
import re
import sys
from datetime import datetime

# Reload the TSV file
tsv_path = sys.argv[1]
df = pd.read_csv(tsv_path, sep="\t")

# Column K is at index 10, parse as datetime (supporting input format 'YYYY-MM-DD hh:mm:ss')
time_col = df.columns[10]
df[time_col] = pd.to_datetime(df[time_col], format='%Y-%m-%d %H:%M:%S', errors='coerce')

# Group by column J (index 9) and get the earliest timestamp for each group
group_col = df.columns[9]
group_min_times = df.groupby(group_col)[time_col].min()

# Sort group names by earliest timestamp
sorted_group_names = group_min_times.sort_values().index.tolist()

result = {"groups": []}

# Function to calculate proper string length (full-width counts as 2)
def effective_length(text):
    return sum(2 if ord(c) > 127 else 1 for c in str(text))

# Process groups in sorted order
for group_name in sorted_group_names[::-1]:
    group_df = df[df[group_col] == group_name]

    group_id = hashlib.md5(group_name.encode("utf-8")).hexdigest()

    # Get earliest date in group and format as YYYY.MM.DD
    group_time = group_df[time_col].min()
    formatted_date = group_time.strftime('%Y.%m.%d') if pd.notnull(group_time) else "Unknown"

    voice_list = []
    for _, row in group_df.iterrows():
        voice = {
            "id": row[0],
            "name": row[3],
            "description": {
                "en": row[4],
                "ja": row[5],
                "zh": row[6]
            },
            "path": row[7],
            "url": row[8]
        }
        voice_list.append(voice)

    # Sort voice_list by description.zh length and lexicographically
    voice_list.sort(key=lambda v: (effective_length(v["description"]["zh"]), v["description"]["zh"]))

    group_entry = {
        "id": group_id,
        "group_name": group_name,
        "group_description": {
            "en": f"{formatted_date} - {group_name}",
            "ja": f"{formatted_date} - {group_name}",
            "zh": f"{formatted_date} - {group_name}"
        },
        "voice_list": voice_list
    }

    result["groups"].append(group_entry)

# Save to JSON
output_path = sys.argv[2]
with open(output_path, "w", encoding="utf-8") as f:
    json.dump(result, f, ensure_ascii=False, indent=2)
