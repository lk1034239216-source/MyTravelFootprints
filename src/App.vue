<script setup>
import { ref, onMounted, watch } from 'vue'
import ChinaMap from './components/ChinaMap.vue'
import ProvinceDetail from './components/ProvinceDetail.vue'
import StatsPanel from './components/StatsPanel.vue'
import AuthPage from './components/AuthPage.vue'
import { useAuth } from './composables/useAuth.js'
import { useTravelData } from './composables/useTravelData.js'

const { user, loading: authLoading, init: initAuth, signOut } = useAuth()
const { loadFromDB, clearLocal, isLoaded } = useTravelData()

const view = ref('china')
const province = ref('')

const enterProvince = (name) => { province.value = name; view.value = 'province' }
const backToChina = () => { view.value = 'china'; province.value = '' }

watch(user, (u) => {
  if (u) loadFromDB(u.id)
  else clearLocal()
})

onMounted(async () => {
  await initAuth()
  if (user.value) loadFromDB(user.value.id)
})
</script>

<template>
  <div v-if="authLoading" class="boot-screen">
    <div class="boot-spinner"></div>
    <span>加载中...</span>
  </div>

  <AuthPage v-else-if="!user" />

  <div v-else class="app">
    <header>
      <div class="header-inner">
        <div class="logo"><span>🗺️</span><h1>旅行足迹记录</h1></div>
        <div class="header-right">
          <span class="user-email">{{ user.email }}</span>
          <button class="logout-btn" @click="signOut">退出</button>
        </div>
      </div>
    </header>

    <main>
      <div v-if="!isLoaded" class="loading-banner">
        <div class="loading-spinner"></div>
        <span>正在同步云端数据...</span>
      </div>
      <StatsPanel />
      <Transition name="fade" mode="out-in">
        <ChinaMap v-if="view === 'china'" key="china" @province-click="enterProvince" />
        <ProvinceDetail v-else key="province" :provinceName="province" @back="backToChina" />
      </Transition>
    </main>

    <footer><p>© 2024 旅行足迹记录 · 记录你的每一次出发</p></footer>
  </div>
</template>

<style scoped>
.boot-screen { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; color: rgba(255,255,255,0.5); font-size: 14px; }
.boot-spinner { width: 32px; height: 32px; border: 3px solid rgba(96,165,250,0.2); border-top-color: #60a5fa; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.app { min-height: 100vh; display: flex; flex-direction: column; }
header { background: rgba(255,255,255,0.04); backdrop-filter: blur(20px); border-bottom: 1px solid rgba(255,255,255,0.08); padding: 14px 0; position: sticky; top: 0; z-index: 100; }
.header-inner { max-width: 1400px; margin: 0 auto; padding: 0 24px; display: flex; align-items: center; justify-content: space-between; }
.logo { display: flex; align-items: center; gap: 10px; }
.logo span { font-size: 28px; }
h1 { font-size: 22px; font-weight: 700; background: linear-gradient(135deg,#60a5fa,#a78bfa,#f472b6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; letter-spacing: 2px; margin: 0; }
.header-right { display: flex; align-items: center; gap: 12px; }
.user-email { font-size: 12px; color: rgba(255,255,255,0.4); max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.logout-btn { padding: 6px 14px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; color: rgba(255,255,255,0.7); font-size: 12px; cursor: pointer; transition: all 0.2s; }
.logout-btn:hover { background: rgba(239,68,68,0.15); border-color: rgba(239,68,68,0.3); color: #f87171; }

main { flex: 1; max-width: 1400px; width: 100%; margin: 0 auto; padding: 20px 24px; display: flex; flex-direction: column; gap: 20px; }
.loading-banner { display: flex; align-items: center; justify-content: center; gap: 10px; padding: 12px; background: rgba(59,130,246,0.1); border: 1px solid rgba(59,130,246,0.2); border-radius: 10px; font-size: 13px; color: #60a5fa; }
.loading-spinner { width: 16px; height: 16px; border: 2px solid rgba(96,165,250,0.3); border-top-color: #60a5fa; border-radius: 50%; animation: spin 0.8s linear infinite; }
footer { background: rgba(255,255,255,0.02); border-top: 1px solid rgba(255,255,255,0.05); padding: 16px; text-align: center; }
footer p { font-size: 11px; color: rgba(255,255,255,0.25); margin: 0; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.25s, transform 0.25s; }
.fade-enter-from { opacity: 0; transform: translateY(16px); }
.fade-leave-to { opacity: 0; transform: translateY(-16px); }
@media (max-width: 768px) {
  h1 { font-size: 18px; }
  .logo span { font-size: 24px; }
  .user-email { display: none; }
  main { padding: 14px 16px; }
}
</style>
