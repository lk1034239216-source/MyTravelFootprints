import { ref } from 'vue'
import { supabase } from '../lib/supabase.js'

const user = ref(null)
const loading = ref(true)

export function useAuth() {
  const init = async () => {
    try {
      console.log('[Auth] 初始化: 获取 session')
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) {
        console.error('[Auth] getSession 失败:', error)
      }
      user.value = session?.user || null
      console.log('[Auth] session:', user.value ? `已登录 (${user.value.email})` : '未登录')
    } catch (e) {
      console.error('[Auth] 初始化内核失败:', e)
    } finally {
      loading.value = false
    }

    supabase.auth.onAuthStateChange((_event, session) => {
      console.log('[Auth] 状态变更:', _event, session?.user?.email || '无')
      user.value = session?.user || null
    })
  }

  const signUp = async (email, password) => {
    console.log('[Auth] 注册:', email)
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) {
      console.error('[Auth] 注册失败:', error)
      throw error
    }
    console.log('[Auth] 注册成功')
    return data
  }

  const signIn = async (email, password) => {
    console.log('[Auth] 登录:', email)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      console.error('[Auth] 登录失败:', error)
      throw error
    }
    console.log('[Auth] 登录成功')
    return data
  }

  const signOut = async () => {
    console.log('[Auth] 退出登录')
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('[Auth] 退出失败:', error)
      throw error
    }
    user.value = null
  }

  return { user, loading, init, signUp, signIn, signOut }
}
