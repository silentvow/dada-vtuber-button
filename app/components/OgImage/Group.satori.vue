<script setup>
// 語音分類頁的 OG 圖 (1200x600)。satori 只支援 flex 與 inline style,
// 版面用絕對定位,避免 flex 子元素高度受字型 line-height 影響而溢出畫布。
const props = defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  siteName: { type: String, default: '' }
});

// 標題越長字越小,最多折兩行
const titleSize = computed(() => (props.title.length > 18 ? 60 : props.title.length > 10 ? 76 : 96));
</script>

<template>
  <div
    :style="{
      position: 'relative',
      display: 'flex',
      width: '1200px',
      height: '600px',
      color: '#ffffff',
      backgroundColor: '#212121',
      backgroundImage: 'linear-gradient(135deg, #212121 0%, #3a0f1b 60%, #bd133d 130%)',
      fontFamily: 'Noto Sans TC, Noto Sans JP, sans-serif'
    }"
  >
    <div
      :style="{
        position: 'absolute',
        top: '56px',
        left: '72px',
        display: 'flex',
        fontSize: '34px',
        fontWeight: 700,
        color: '#ff8a80'
      }"
    >
      {{ siteName }}
    </div>
    <div
      :style="{
        position: 'absolute',
        top: '190px',
        left: '72px',
        width: '1056px',
        display: 'flex',
        fontSize: `${titleSize}px`,
        fontWeight: 700,
        lineHeight: 1.25
      }"
    >
      {{ title }}
    </div>
    <div
      v-if="subtitle"
      :style="{
        position: 'absolute',
        top: '440px',
        left: '72px',
        display: 'flex',
        fontSize: '40px',
        fontWeight: 700,
        color: '#ffcdd2'
      }"
    >
      {{ subtitle }}
    </div>
  </div>
</template>
