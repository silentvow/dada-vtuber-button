import os
import csv

def create_tsv_from_text_files(folder_path, output_tsv_path, filename_prefix='', file_extension='.txt'):
    """
    將指定資料夾內的所有文字檔案整理成一個TSV檔案。

    Parameters:
        folder_path (str): 資料夾路徑
        output_tsv_path (str): 輸出 TSV 檔案的路徑
        filename_prefix (str): 檔名欄位前綴字串（預設為空）
        file_extension (str): 要處理的檔案副檔名（預設為 .txt）
    """
    rows = []

    for filename in os.listdir(folder_path):
        if filename.endswith(file_extension):
            file_path = os.path.join(folder_path, filename)
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read().strip()
                rows.append([f"{filename_prefix}{filename}", content])

    with open(output_tsv_path, 'w', encoding='utf-8', newline='') as tsvfile:
        writer = csv.writer(tsvfile, delimiter='\t')
        writer.writerow(['Filename', 'Content'])  # 表頭
        writer.writerows(rows)

    print(f"已成功產生 TSV 檔案：{output_tsv_path}")


# 範例用法：
# 指定資料夾、輸出檔案路徑，及可選擇性設定的檔名前綴
create_tsv_from_text_files(
    folder_path='static/voices/_txt',
    output_tsv_path='output.tsv',
    filename_prefix='discord-20250408/'
)
