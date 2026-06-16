<script setup>
import { ref, computed, onMounted } from 'vue'
import { useTravelData } from '../composables/useTravelData.js'
import ImageLightbox from './ImageLightbox.vue'

const props = defineProps({ cityName: { type: String, required: true } })
const emit = defineEmits(['add', 'edit', 'close'])

const { getSortedRecords, getVisitCount, deleteRecord } = useTravelData()

const visible = ref(false)
const showLB = ref(false)
const lbImages = ref([])
const lbIndex = ref(0)

const confirmDelete = ref(null)

const records = computed(() => getSortedRecords(props.cityName))
const count = computed(() => getVisitCount(props.cityName))

const fmtDate = (d) => {
  if (!d) return '未知日期'
  const dt = new Date(d)
  return `${dt.getFullYear()} 年 ${String(dt.getMonth() + 1).padStart(2, '0')} 月 ${String(dt.getDate()).padStart(2, '0')} 日`
}

const gridCls = (n) => n === 1 ? 'g1' : n === 2 ? 'g2' : n === 4 ? 'g4' : 'gn'

onMounted(() => { requestAnimationFrame(() => { visible.value = true }) })
const close = () => { visible.value = false; setTimeout(() => emit('close'), 300) }
const overlayClick = e => { if (e.target === e.currentTarget) close() }
const openLB = (imgs, i) => { lbImages.value = imgs; lbIndex.value = i; showLB.value = true }
const closeLB = () => { showLB.value = false }

const askDelete = (rec) => { confirmDelete.value = rec }
const cancelDelete = () => { confirmDelete.value = null }
const doDelete = () => {
  if (!confirmDelete.value) return
  deleteRecord(props.cityName, confirmDelete.value.id)
  confirmDelete.value = null
  if (records.value.length === 0) close()
}
</script>

<template>
  <Teleport to="body">
    <div class="overlay" :class="{ show: visible }" @click="overlayClick">
      <div class="modal" :class="{ show: visible }">
        <button class="x" @click="close">✕</button>

        <div class="head">
          <div class="dec"><div class="line"></div><span>✈️</span><div class="line"></div></div>
          <h2>{{ cityName }}</h2>
          <div class="meta">
            <span class="cnt">已造访 {{ count }} 次</span>
            <button class="revisit" @click="emit('add')">➕ 再次造访</button>
          </div>
        </div>

        <div class="body">
          <div class="timeline">
            <div v-for="(rec, idx) in records" :key="rec.id" class="tl-item">
              <div class="tl-rail">
                <div class="tl-dot"></div>
                <div v-if="idx < records.length - 1" class="tl-line"></div>
              </div>
              <div class="tl-card">
                <div class="card-head">
                  <span class="card-date">📅 {{ fmtDate(rec.date) }}</span>
                  <div class="card-actions">
                    <button class="card-btn" @click="emit('edit', rec)" title="编辑">✏️</button>
                    <button class="card-btn danger" @click="askDelete(rec)" title="删除">🗑️</button>
                  </div>
                </div>

                <div v-if="rec.companions?.length" class="card-companions">
                  <span class="companion-icon">👥</span>
                  <span v-for="c in rec.companions" :key="c" class="companion-chip">{{ c }}</span>
                </div>

                <div v-if="rec.images?.length" class="card-imgs">
                  <div class="img-grid" :class="gridCls(rec.images.length)">
                    <div v-for="(img, ii) in rec.images" :key="img.id" class="img-cell" @click="openLB(rec.images, ii)">
                      <img :src="img.url" :alt="img.name" />
                      <div class="img-hover"><span>🔍</span></div>
                    </div>
                  </div>
                </div>

                <div v-if="rec.thoughts?.trim()" class="card-thoughts">
                  <div class="thoughts-box">
                    <span class="q">"</span>
                    <p>{{ rec.thoughts }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="foot">
          <button class="btn close-btn" @click="close">关闭</button>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <Transition name="confirm">
        <div v-if="confirmDelete" class="confirm-overlay">
          <div class="confirm-box">
            <div class="confirm-icon">⚠️</div>
            <h3>确认删除</h3>
            <p>确定要删除 <b>{{ cityName }}</b> 在 <b>{{ fmtDate(confirmDelete.date) }}</b> 的旅行记录吗？</p>
            <p class="warn">此操作不可撤销</p>
            <div class="confirm-actions">
              <button class="btn cancel-btn" @click="cancelDelete">取消</button>
              <button class="btn del-btn" @click="doDelete">确认删除</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <ImageLightbox v-if="showLB" :images="lbImages" :initialIndex="lbIndex" @close="closeLB" />
  </Teleport>
</template>

<style scoped>
.overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(10px); display: flex; align-items: center; justify-content: center; z-index: 1000; opacity: 0; transition: opacity 0.3s; padding: 20px; }
.overlay.show { opacity: 1; }
.modal { background: linear-gradient(145deg,#1e293b,#0f172a); border: 1px solid rgba(96,165,250,0.2); border-radius: 24px; max-width: 580px; width: 100%; max-height: 90vh; display: flex; flex-direction: column; position: relative; transform: scale(0.9) translateY(20px); transition: transform 0.3s; box-shadow: 0 25px 50px rgba(0,0,0,0.5), 0 0 80px rgba(59,130,246,0.08); overflow: hidden; }
.modal.show { transform: scale(1) translateY(0); }
.x { position: absolute; top: 14px; right: 14px; background: rgba(255,255,255,0.1); border: none; color: rgba(255,255,255,0.6); width: 34px; height: 34px; border-radius: 50%; cursor: pointer; font-size: 15px; display: flex; align-items: center; justify-content: center; transition: all 0.2s; z-index: 10; }
.x:hover { background: rgba(255,255,255,0.2); color: #fff; }
.head { padding: 28px 24px 18px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.06); flex-shrink: 0; }
.dec { display: flex; align-items: center; justify-content: center; gap: 14px; margin-bottom: 12px; }
.line { width: 50px; height: 1px; background: linear-gradient(90deg, transparent, rgba(96,165,250,0.4), transparent); }
.dec span { font-size: 22px; }
h2 { font-size: 30px; font-weight: 700; background: linear-gradient(135deg,#60a5fa,#a78bfa,#f472b6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; margin: 0 0 12px; letter-spacing: 2px; }
.meta { display: flex; align-items: center; justify-content: center; gap: 14px; flex-wrap: wrap; }
.cnt { font-size: 13px; color: rgba(255,255,255,0.5); background: rgba(255,255,255,0.05); padding: 4px 14px; border-radius: 12px; }
.revisit { display: inline-flex; align-items: center; gap: 6px; padding: 8px 20px; background: linear-gradient(135deg,#10b981,#059669); border: none; border-radius: 10px; color: #fff; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 12px rgba(16,185,129,0.3); }
.revisit:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(16,185,129,0.4); }
.body { padding: 20px 24px; overflow-y: auto; flex: 1; }
.timeline { position: relative; }
.tl-item { display: flex; gap: 14px; }
.tl-rail { display: flex; flex-direction: column; align-items: center; flex-shrink: 0; width: 18px; }
.tl-dot { width: 10px; height: 10px; background: linear-gradient(135deg,#60a5fa,#a78bfa); border-radius: 50%; flex-shrink: 0; box-shadow: 0 0 8px rgba(96,165,250,0.4); }
.tl-line { width: 2px; flex: 1; background: linear-gradient(180deg, rgba(96,165,250,0.35), rgba(167,139,250,0.15)); margin: 3px 0; min-height: 16px; }
.tl-card { flex: 1; background: rgba(255,255,255,0.025); border-radius: 14px; border: 1px solid rgba(255,255,255,0.06); padding: 14px; margin-bottom: 14px; transition: border-color 0.2s; }
.tl-card:hover { border-color: rgba(96,165,250,0.15); }
.card-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.card-date { font-size: 14px; font-weight: 600; color: #60a5fa; }
.card-actions { display: flex; gap: 6px; }
.card-btn { background: rgba(255,255,255,0.07); border: none; width: 28px; height: 28px; border-radius: 7px; cursor: pointer; font-size: 12px; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
.card-btn:hover { background: rgba(255,255,255,0.14); transform: scale(1.08); }
.card-btn.danger:hover { background: rgba(239,68,68,0.2); }
.card-companions { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
.companion-icon { font-size: 13px; margin-right: 2px; }
.companion-chip { font-size: 12px; padding: 3px 10px; border-radius: 12px; background: rgba(168,85,247,0.12); border: 1px solid rgba(168,85,247,0.25); color: #c084fc; }
.card-imgs { margin-bottom: 10px; }
.img-grid { display: grid; gap: 6px; }
.img-grid.g1 { grid-template-columns: 1fr; }
.img-grid.g2 { grid-template-columns: repeat(2,1fr); }
.img-grid.g4 { grid-template-columns: repeat(2,1fr); }
.img-grid.gn { grid-template-columns: repeat(3,1fr); }
.img-cell { position: relative; aspect-ratio: 1; border-radius: 8px; overflow: hidden; cursor: pointer; background: rgba(255,255,255,0.04); }
.img-cell img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s; }
.img-cell:hover img { transform: scale(1.05); }
.img-hover { position: absolute; inset: 0; background: rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.2s; }
.img-cell:hover .img-hover { opacity: 1; }
.img-hover span { font-size: 22px; }
.card-thoughts { }
.thoughts-box { position: relative; padding: 10px 14px; background: rgba(255,255,255,0.02); border-radius: 10px; border-left: 3px solid rgba(96,165,250,0.35); }
.q { font-size: 32px; line-height: 1; color: rgba(96,165,250,0.2); font-family: Georgia, serif; position: absolute; top: 2px; left: 6px; }
.thoughts-box p { font-size: 13px; line-height: 1.7; color: rgba(255,255,255,0.75); margin: 0; padding-left: 20px; text-align: justify; }
.foot { padding: 14px 24px 20px; border-top: 1px solid rgba(255,255,255,0.06); flex-shrink: 0; }
.btn { width: 100%; padding: 12px; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; border: none; }
.close-btn { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.75); border: 1px solid rgba(255,255,255,0.1); }
.close-btn:hover { background: rgba(255,255,255,0.12); }

.confirm-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; z-index: 2000; padding: 20px; }
.confirm-box { background: linear-gradient(145deg,#1e293b,#0f172a); border: 1px solid rgba(239,68,68,0.25); border-radius: 20px; padding: 32px; max-width: 380px; width: 100%; text-align: center; box-shadow: 0 20px 50px rgba(0,0,0,0.5); }
.confirm-icon { font-size: 44px; margin-bottom: 12px; }
.confirm-box h3 { font-size: 20px; font-weight: 700; color: #f87171; margin: 0 0 12px; }
.confirm-box p { font-size: 14px; color: rgba(255,255,255,0.7); margin: 0 0 8px; line-height: 1.6; }
.confirm-box .warn { font-size: 12px; color: rgba(255,255,255,0.35); margin-bottom: 20px; }
.confirm-actions { display: flex; gap: 10px; }
.cancel-btn { flex: 1; padding: 11px; background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.75); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; }
.cancel-btn:hover { background: rgba(255,255,255,0.12); }
.del-btn { flex: 1; padding: 11px; background: linear-gradient(135deg,#ef4444,#dc2626); color: #fff; border: none; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 12px rgba(239,68,68,0.3); }
.del-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(239,68,68,0.4); }

.confirm-enter-active { transition: all 0.25s ease; }
.confirm-leave-active { transition: all 0.2s ease; }
.confirm-enter-from, .confirm-leave-to { opacity: 0; }
.confirm-enter-from .confirm-box { transform: scale(0.9); }

@media (max-width: 480px) {
  .modal { max-height: 95vh; border-radius: 18px; }
  .head { padding: 22px 16px 14px; }
  h2 { font-size: 24px; }
  .body { padding: 14px 16px; }
  .tl-card { padding: 10px; }
}
</style>
