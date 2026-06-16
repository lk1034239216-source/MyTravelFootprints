<script setup>
import { computed } from 'vue'
import { useTravelData } from '../composables/useTravelData.js'

const { getAllStats } = useTravelData()
const stats = computed(() => getAllStats())
</script>

<template>
  <div class="stats-bar">
    <div class="stat">
      <span class="stat-icon">🏙️</span>
      <span class="stat-val">{{ stats.visitedCities }}</span>
      <span class="stat-label">已到访城市</span>
    </div>
    <div class="divider"></div>
    <div class="stat">
      <span class="stat-icon">📝</span>
      <span class="stat-val">{{ stats.totalRecords }}</span>
      <span class="stat-label">旅行记录</span>
    </div>
  </div>
</template>

<style scoped>
.stats-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 32px;
  padding: 16px 24px;
  background: rgba(255,255,255,0.03);
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.06);
}
.stat { display: flex; align-items: center; gap: 8px; }
.stat-icon { font-size: 22px; }
.stat-val { font-size: 26px; font-weight: 700; background: linear-gradient(135deg,#60a5fa,#a78bfa); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.stat-label { font-size: 12px; color: rgba(255,255,255,0.45); }
.divider { width: 1px; height: 32px; background: rgba(255,255,255,0.1); }
</style>
