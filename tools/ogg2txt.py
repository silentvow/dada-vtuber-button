import os
import whisper
import subprocess

# 設定 OGG 檔案夾
input_folder = "C:/Users/User/repos/dada-vtuber-button/static/voices/discord-20250319"
output_folder = "C:/Users/User/repos/dada-vtuber-button/static/voices/_txt"

# 確保輸出目錄存在
os.makedirs(output_folder, exist_ok=True)

# 初始化 Whisper 模型
model = whisper.load_model("base")

for filename in os.listdir(input_folder):
    if filename.endswith(".ogg"):
        ogg_path = os.path.join(input_folder, filename)
        wav_path = os.path.join(input_folder, filename.replace(".ogg", ".wav"))
        text_path = os.path.join(output_folder, filename.replace(".ogg", ".txt"))

        # 轉換 OGG 為 WAV（Whisper 不支援 OGG）
        subprocess.run(["ffmpeg", "-i", ogg_path, "-ar", "16000", "-ac", "1", wav_path, "-y"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

        # 語音轉文字
        result = model.transcribe(wav_path, language="zh")
        with open(text_path, "w", encoding="utf-8") as f:
            f.write(result["text"])

        # 刪除轉換的 WAV 檔（如果不需要）
        os.remove(wav_path)

print("批量轉換完成！所有文本已儲存至:", output_folder)
