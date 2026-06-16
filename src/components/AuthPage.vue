<script setup>
import { ref } from 'vue'
import { useAuth } from '../composables/useAuth.js'

const { signIn, signUp } = useAuth()

const mode = ref('login')
const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)
const success = ref('')

const handleSubmit = async () => {
  error.value = ''
  success.value = ''
  loading.value = true
  try {
    if (mode.value === 'login') {
      await signIn(email.value, password.value)
    } else {
      await signUp(email.value, password.value)
      success.value = '注册成功！请查看邮箱确认链接（或直接登录）'
      mode.value = 'login'
    }
  } catch (e) {
    error.value = e.message || '操作失败'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-header">
        <span class="auth-icon">🗺️</span>
        <h1>旅行足迹记录</h1>
        <p>登录后开始记录你的旅程</p>
      </div>

      <div class="auth-tabs">
        <button :class="{ active: mode === 'login' }" @click="mode = 'login'; error = ''; success = ''">登录</button>
        <button :class="{ active: mode === 'register' }" @click="mode = 'register'; error = ''; success = ''">注册</button>
      </div>

      <form @submit.prevent="handleSubmit" class="auth-form">
        <div class="field">
          <label>📧 邮箱</label>
          <input v-model="email" type="email" placeholder="your@email.com" required />
        </div>
        <div class="field">
          <label>🔒 密码</label>
          <input v-model="password" type="password" placeholder="至少 6 位" minlength="6" required />
        </div>

        <p v-if="error" class="err-msg">{{ error }}</p>
        <p v-if="success" class="success-msg">{{ success }}</p>

        <button type="submit" class="submit-btn" :disabled="loading">
          {{ loading ? '处理中...' : (mode === 'login' ? '登录' : '注册') }}
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.auth-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
.auth-card { background: linear-gradient(145deg, #1e293b, #0f172a); border: 1px solid rgba(96,165,250,0.2); border-radius: 24px; padding: 40px; max-width: 400px; width: 100%; box-shadow: 0 25px 50px rgba(0,0,0,0.4); }
.auth-header { text-align: center; margin-bottom: 28px; }
.auth-icon { font-size: 48px; display: block; margin-bottom: 12px; }
h1 { font-size: 24px; font-weight: 700; background: linear-gradient(135deg,#60a5fa,#a78bfa); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; margin: 0 0 8px; }
.auth-header p { font-size: 13px; color: rgba(255,255,255,0.45); margin: 0; }
.auth-tabs { display: flex; gap: 4px; background: rgba(255,255,255,0.05); border-radius: 10px; padding: 4px; margin-bottom: 24px; }
.auth-tabs button { flex: 1; padding: 10px; border: none; border-radius: 8px; background: transparent; color: rgba(255,255,255,0.5); font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
.auth-tabs button.active { background: rgba(96,165,250,0.2); color: #60a5fa; }
.auth-form { display: flex; flex-direction: column; gap: 16px; }
.field label { display: block; font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.7); margin-bottom: 6px; }
.field input { width: 100%; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 11px 14px; color: #e2e8f0; font-size: 14px; box-sizing: border-box; transition: border-color 0.2s; }
.field input:focus { outline: none; border-color: rgba(96,165,250,0.5); }
::placeholder { color: rgba(255,255,255,0.25); }
.err-msg { font-size: 13px; color: #f87171; background: rgba(239,68,68,0.1); padding: 10px 14px; border-radius: 8px; margin: 0; }
.success-msg { font-size: 13px; color: #4ade80; background: rgba(34,197,94,0.1); padding: 10px 14px; border-radius: 8px; margin: 0; }
.submit-btn { padding: 13px; border: none; border-radius: 12px; background: linear-gradient(135deg,#3b82f6,#8b5cf6); color: #fff; font-size: 15px; font-weight: 600; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 12px rgba(59,130,246,0.3); }
.submit-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(59,130,246,0.4); }
.submit-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
</style>
