<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useTravelData } from '../composables/useTravelData.js'

const props = defineProps({
  cityName: { type: String, required: true },
  record: { type: Object, default: null },
  isAddingNew: { type: Boolean, default: false }
})

const emit = defineEmits(['save', 'close'])

const { getCompanions, addCompanion, removeCompanion } = useTravelData()

const visible = ref(false)
const form = ref({
  date: props.record?.date || new Date().toISOString().split('T')[0],
  thoughts: props.record?.thoughts || '',
  images: props.record?.images ? [...props.record.images] : [],
  companions: props.record?.companions ? [...props.record.companions] : [],
  fromCity: props.record?.fromCity || '',
  transportType: props.record?.transportType || '',
  durationDays: props.record?.durationDays || 0,
  dailySteps: props.record?.dailySteps ? [...props.record.dailySteps] : []
})

watch(() => form.value.durationDays, (newVal) => {
  const days = Math.max(0, Math.min(30, Number(newVal) || 0))
  while (form.value.dailySteps.length < days) form.value.dailySteps.push(0)
  form.value.dailySteps.length = days
})

const MAX = 9
const fileRef = ref(null)
const canAdd = computed(() => form.value.images.length < MAX)
const isEdit = computed(() => !!props.record && !props.isAddingNew)
const title = computed(() => isEdit.value ? '编辑旅行记录' : props.isAddingNew ? '再次造访' : '添加首次记录')
const icon = computed(() => isEdit.value ? '📝' : props.isAddingNew ? '🔄' : '✈️')
const btnText = computed(() => isEdit.value ? '更新记录' : '保存记录')

const showCompanionInput = ref(false)
const newCompanionName = ref('')
const companionList = computed(() => getCompanions())

const transportOptions = [
  { key: 'plane', icon: '✈️', label: '飞机' },
  { key: 'train', icon: '🚄', label: '高铁' },
  { key: 'car', icon: '🚗', label: '自驾' },
  { key: 'other', icon: '🗺️', label: '其他' }
]

const CITY_LIST = [
  '北京','天津','上海','重庆','广州','深圳','成都','杭州','武汉','南京',
  '西安','长沙','郑州','合肥','昆明','贵阳','福州','厦门','南昌','太原',
  '济南','青岛','哈尔滨','长春','沈阳','大连','兰州','银川','西宁',
  '乌鲁木齐','拉萨','呼和浩特','南宁','海口','三亚','珠海','汕头',
  '苏州','无锡','宁波','温州','常州','徐州','烟台','潍坊',
  '洛阳','宜昌','襄阳','岳阳','常德','郴州','株洲','湘潭','衡阳','邵阳',
  '永州','怀化','娄底','张家界','益阳',
  '桂林','柳州','遵义','绵阳','宜宾','大理','丽江','西双版纳',
  '扬州','镇江','泰州','嘉兴','湖州','绍兴','金华','台州','丽水',
  '泉州','漳州','龙岩','三明','莆田','南平','宁德',
  '九江','赣州','景德镇','上饶','宜春','吉安','抚州',
  '芜湖','蚌埠','安庆','黄山','阜阳','宿州','六安','亳州',
  '绵阳','泸州','德阳','乐山','南充','达州','眉山','雅安',
  '曲靖','玉溪','红河','大理','丽江','西双版纳',
  '咸阳','宝鸡','渭南','延安','汉中','榆林',
  '三亚','儋州','张家口','承德','秦皇岛','唐山','保定','廊坊','沧州',
  '日照','威海','泰安','德州','聊城','滨州','菏泽',
  '开封','平顶山','安阳','新乡','焦作','许昌','南阳','商丘','信阳',
  '黄石','十堰','荆门','孝感','荆州','黄冈','咸宁','随州',
  '芜湖','连云港','盐城','淮安','宿迁',
  '新余','鹰潭','萍乡',
  '汕尾','河源','阳江','清远','东莞','中山','潮州','揭阳','云浮','茂名','肇庆','惠州','梅州','韶关'
]
const fromCityQuery = ref('')
const showFromDropdown = ref(false)
const filteredCities = computed(() => {
  if (!fromCityQuery.value) return CITY_LIST
  return CITY_LIST.filter(c => c.includes(fromCityQuery.value))
})

const selectFromCity = (city) => {
  form.value.fromCity = city
  fromCityQuery.value = city
  showFromDropdown.value = false
}
const clearFromCity = () => {
  form.value.fromCity = ''
  fromCityQuery.value = ''
}

onMounted(() => {
  requestAnimationFrame(() => { visible.value = true })
  if (form.value.fromCity) fromCityQuery.value = form.value.fromCity
})

const close = () => { visible.value = false; setTimeout(() => emit('close'), 300) }
const overlayClick = e => { if (e.target === e.currentTarget) close() }

const save = () => {
  if (!form.value.date) return alert('请选择旅行时间')
  emit('save', props.cityName, {
    date: form.value.date,
    thoughts: form.value.thoughts,
    images: form.value.images,
    companions: form.value.companions,
    fromCity: form.value.fromCity,
    transportType: form.value.transportType,
    durationDays: Number(form.value.durationDays) || 0,
    dailySteps: form.value.dailySteps.map(Number)
  })
}

const pickFiles = () => fileRef.value?.click()
const onFiles = (e) => {
  const files = Array.from(e.target.files)
  const left = MAX - form.value.images.length
  if (files.length > left) return alert(`最多 ${MAX} 张，还可添加 ${left} 张`)
  files.forEach(f => {
    if (!f.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = ev => { form.value.images.push({ id: Date.now() + Math.random(), url: ev.target.result, name: f.name }) }
    reader.readAsDataURL(f)
  })
  e.target.value = ''
}
const removeImg = i => form.value.images.splice(i, 1)

const toggleCompanion = (name) => {
  const idx = form.value.companions.indexOf(name)
  if (idx === -1) form.value.companions.push(name)
  else form.value.companions.splice(idx, 1)
}
const isCompanionSelected = (name) => form.value.companions.includes(name)

const handleAddCompanion = () => {
  if (addCompanion(newCompanionName.value)) {
    form.value.companions.push(newCompanionName.value.trim())
    newCompanionName.value = ''
    showCompanionInput.value = false
  }
}
const handleRemoveCompanion = (name) => {
  removeCompanion(name)
  const idx = form.value.companions.indexOf(name)
  if (idx !== -1) form.value.companions.splice(idx, 1)
}
</script>

<template>
  <Teleport to="body">
    <div class="overlay" :class="{ show: visible }" @click="overlayClick">
      <div class="modal" :class="{ show: visible }">
        <div class="head">
          <div class="head-left"><span class="icon">{{ icon }}</span><div><h3>{{ title }}</h3><p class="sub">{{ cityName }}</p></div></div>
          <button class="x" @click="close">✕</button>
        </div>

        <div v-if="isAddingNew" class="notice">ℹ️ 将为 <b>{{ cityName }}</b> 追加一条新记录</div>

        <div class="body">
          <div class="field">
            <label>📅 旅行时间</label>
            <input type="date" v-model="form.date" :max="new Date().toISOString().split('T')[0]" />
          </div>

          <div class="field">
            <label>🚀 出发城市 <span class="optional">（可选）</span></label>
            <div class="from-city-wrap">
              <div class="from-input-row">
                <input
                  v-model="fromCityQuery"
                  placeholder="输入或选择出发城市"
                  @focus="showFromDropdown = true"
                  @input="form.fromCity = fromCityQuery"
                />
                <button v-if="form.fromCity" class="clear-btn" @click="clearFromCity">×</button>
              </div>
              <div v-if="showFromDropdown" class="dropdown">
                <div class="dropdown-list">
                  <div
                    v-for="city in filteredCities" :key="city"
                    class="dropdown-item"
                    :class="{ active: form.fromCity === city }"
                    @mousedown.prevent="selectFromCity(city)"
                  >
                    {{ city }}
                  </div>
                  <div v-if="filteredCities.length === 0" class="dropdown-empty">无匹配城市</div>
                </div>
              </div>
            </div>
          </div>

          <div class="field" v-if="form.fromCity">
            <label>🚆 交通工具</label>
            <div class="transport-grid">
              <div
                v-for="t in transportOptions" :key="t.key"
                class="transport-item"
                :class="{ active: form.transportType === t.key }"
                @click="form.transportType = form.transportType === t.key ? '' : t.key"
              >
                <span class="t-icon">{{ t.icon }}</span>
                <span class="t-label">{{ t.label }}</span>
              </div>
            </div>
          </div>

          <div class="field">
            <label>⏱️ 旅行天数 <span class="optional">（可选）</span></label>
            <input
              type="number"
              v-model.number="form.durationDays"
              min="0"
              max="30"
              placeholder="0"
              class="steps-input"
            />
          </div>

          <div v-if="form.durationDays > 0" class="field">
            <label>🏃 每日步数</label>
            <div class="steps-grid">
              <div v-for="(_, i) in form.dailySteps" :key="i" class="steps-row">
                <span class="steps-day">第 {{ i + 1 }} 天</span>
                <input
                  type="number"
                  v-model.number="form.dailySteps[i]"
                  min="0"
                  placeholder="步数"
                  class="steps-value"
                />
                <span class="steps-unit">步</span>
              </div>
            </div>
            <p class="steps-total" v-if="form.dailySteps.length > 0">
              合计 <b>{{ form.dailySteps.reduce((s, v) => s + (Number(v) || 0), 0).toLocaleString() }}</b> 步
            </p>
          </div>

          <div class="field">
            <label>
              👥 同行人
              <span class="companion-count" v-if="form.companions.length">{{ form.companions.length }} 人</span>
            </label>
            <div class="companion-area">
              <div class="companion-tags" v-if="companionList.length || form.companions.length">
                <span v-for="c in companionList" :key="c" class="companion-tag" :class="{ selected: isCompanionSelected(c) }" @click="toggleCompanion(c)">
                  {{ c }}
                  <button class="tag-remove" @click.stop="handleRemoveCompanion(c)" title="删除此人">×</button>
                </span>
              </div>
              <div class="companion-add">
                <button v-if="!showCompanionInput" class="add-companion-btn" @click="showCompanionInput = true">+ 添加同行人</button>
                <div v-else class="companion-input-row">
                  <input v-model="newCompanionName" placeholder="输入姓名" @keyup.enter="handleAddCompanion" />
                  <button class="confirm-add" @click="handleAddCompanion">✓</button>
                  <button class="cancel-add" @click="showCompanionInput = false; newCompanionName = ''">×</button>
                </div>
              </div>
            </div>
          </div>

          <div class="field">
            <label>💭 旅行感受</label>
            <textarea v-model="form.thoughts" placeholder="记录下这次旅行的感受..." rows="4"></textarea>
          </div>
          <div class="field">
            <label>📸 旅行照片 <span class="count">({{ form.images.length }}/{{ MAX }})</span></label>
            <div class="img-grid">
              <div v-for="(img, i) in form.images" :key="img.id" class="img-cell">
                <img :src="img.url" :alt="img.name" />
                <button class="img-del" @click="removeImg(i)">×</button>
              </div>
              <div v-if="canAdd" class="img-add" @click="pickFiles"><span>+</span></div>
            </div>
            <input ref="fileRef" type="file" accept="image/*" multiple hidden @change="onFiles" />
            <p class="hint">支持 JPG / PNG，最多 {{ MAX }} 张</p>
          </div>
        </div>

        <div class="foot">
          <button class="btn cancel" @click="close">取消</button>
          <button class="btn primary" @click="save">{{ btnText }}</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(10px); display: flex; align-items: center; justify-content: center; z-index: 1000; opacity: 0; transition: opacity 0.3s; padding: 20px; }
.overlay.show { opacity: 1; }
.modal { background: linear-gradient(145deg,#1e293b,#0f172a); border: 1px solid rgba(96,165,250,0.2); border-radius: 20px; max-width: 520px; width: 100%; max-height: 90vh; display: flex; flex-direction: column; transform: scale(0.9) translateY(20px); transition: transform 0.3s; box-shadow: 0 25px 50px rgba(0,0,0,0.5); overflow-y: auto; }
.modal.show { transform: scale(1) translateY(0); }
.head { display: flex; align-items: center; justify-content: space-between; padding: 24px 24px 16px; border-bottom: 1px solid rgba(255,255,255,0.08); flex-shrink: 0; }
.head-left { display: flex; align-items: center; gap: 12px; }
.icon { font-size: 28px; }
h3 { font-size: 18px; font-weight: 700; background: linear-gradient(135deg,#60a5fa,#a78bfa); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; margin: 0; }
.sub { font-size: 12px; color: rgba(255,255,255,0.45); margin: 2px 0 0; }
.x { background: rgba(255,255,255,0.1); border: none; color: rgba(255,255,255,0.6); width: 32px; height: 32px; border-radius: 50%; cursor: pointer; font-size: 14px; transition: all 0.2s; }
.x:hover { background: rgba(255,255,255,0.2); color: #fff; }
.notice { margin: 0 24px; padding: 10px 14px; background: rgba(59,130,246,0.1); border: 1px solid rgba(59,130,246,0.2); border-radius: 10px; font-size: 13px; color: #60a5fa; flex-shrink: 0; }
.body { padding: 20px 24px; overflow-y: auto; flex: 1; }
.field { margin-bottom: 20px; }
.field:last-child { margin-bottom: 0; }
label { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.75); margin-bottom: 8px; }
.count { font-weight: 400; color: rgba(255,255,255,0.35); margin-left: auto; }
.optional { font-weight: 400; color: rgba(255,255,255,0.35); font-size: 12px; }
.companion-count { font-weight: 400; color: #60a5fa; margin-left: auto; font-size: 12px; }
input[type="date"], textarea { width: 100%; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 10px 14px; color: #e2e8f0; font-size: 14px; font-family: inherit; transition: border-color 0.2s; box-sizing: border-box; }
input:focus, textarea:focus { outline: none; border-color: rgba(96,165,250,0.5); box-shadow: 0 0 0 3px rgba(96,165,250,0.08); }
input::-webkit-calendar-picker-indicator { filter: invert(1); cursor: pointer; }
textarea { resize: vertical; min-height: 90px; line-height: 1.6; }
::placeholder { color: rgba(255,255,255,0.25); }

.from-city-wrap { position: relative; }
.from-input-row { display: flex; gap: 6px; }
.from-input-row input { flex: 1; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 10px 14px; color: #e2e8f0; font-size: 14px; }
.clear-btn { width: 36px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; color: rgba(255,255,255,0.5); cursor: pointer; font-size: 16px; transition: all 0.2s; }
.clear-btn:hover { background: rgba(239,68,68,0.2); color: #f87171; }
.dropdown { position: absolute; top: 100%; left: 0; right: 0; margin-top: 4px; background: #1e293b; border: 1px solid rgba(96,165,250,0.2); border-radius: 10px; max-height: 200px; overflow-y: auto; z-index: 10; box-shadow: 0 10px 30px rgba(0,0,0,0.4); }
.dropdown-list { padding: 4px; }
.dropdown-item { padding: 8px 12px; border-radius: 6px; font-size: 13px; color: rgba(255,255,255,0.75); cursor: pointer; transition: background 0.15s; }
.dropdown-item:hover { background: rgba(96,165,250,0.15); }
.dropdown-item.active { background: rgba(96,165,250,0.2); color: #60a5fa; }
.dropdown-empty { padding: 12px; text-align: center; font-size: 12px; color: rgba(255,255,255,0.3); }
.dropdown::-webkit-scrollbar { width: 4px; }
.dropdown::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }

.transport-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.transport-item { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 12px 8px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; cursor: pointer; transition: all 0.2s; }
.transport-item:hover { background: rgba(255,255,255,0.08); border-color: rgba(96,165,250,0.3); }
.transport-item.active { background: rgba(96,165,250,0.15); border-color: rgba(96,165,250,0.5); }
.t-icon { font-size: 24px; }
.t-label { font-size: 12px; color: rgba(255,255,255,0.6); }
.transport-item.active .t-label { color: #60a5fa; }

.steps-input { width: 100%; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 10px 14px; color: #e2e8f0; font-size: 14px; box-sizing: border-box; }
.steps-input:focus { outline: none; border-color: rgba(96,165,250,0.5); box-shadow: 0 0 0 3px rgba(96,165,250,0.08); }
.steps-grid { display: flex; flex-direction: column; gap: 8px; }
.steps-row { display: flex; align-items: center; gap: 10px; }
.steps-day { font-size: 13px; color: rgba(255,255,255,0.6); min-width: 60px; text-align: right; }
.steps-value { flex: 1; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 8px 12px; color: #e2e8f0; font-size: 14px; box-sizing: border-box; }
.steps-value:focus { outline: none; border-color: rgba(96,165,250,0.5); }
.steps-unit { font-size: 12px; color: rgba(255,255,255,0.4); min-width: 24px; }
.steps-total { margin-top: 10px; font-size: 13px; color: rgba(255,255,255,0.5); text-align: right; }
.steps-total b { color: #fbbf24; }

.img-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.img-cell { position: relative; aspect-ratio: 1; border-radius: 8px; overflow: hidden; background: rgba(255,255,255,0.05); }
.img-cell img { width: 100%; height: 100%; object-fit: cover; }
.img-del { position: absolute; top: 4px; right: 4px; width: 22px; height: 22px; background: rgba(239,68,68,0.9); border: none; border-radius: 50%; color: #fff; font-size: 13px; cursor: pointer; opacity: 0; transition: opacity 0.2s; display: flex; align-items: center; justify-content: center; }
.img-cell:hover .img-del { opacity: 1; }
.img-add { aspect-ratio: 1; border-radius: 8px; border: 2px dashed rgba(255,255,255,0.15); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; }
.img-add:hover { border-color: rgba(96,165,250,0.5); background: rgba(96,165,250,0.05); }
.img-add span { font-size: 28px; color: rgba(255,255,255,0.3); }
.hint { margin-top: 8px; font-size: 11px; color: rgba(255,255,255,0.3); }

.companion-area { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 10px; }
.companion-tags { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; }
.companion-tag { display: inline-flex; align-items: center; gap: 4px; padding: 5px 12px; border-radius: 20px; font-size: 13px; cursor: pointer; transition: all 0.2s; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.7); user-select: none; }
.companion-tag:hover { background: rgba(255,255,255,0.1); }
.companion-tag.selected { background: rgba(96,165,250,0.2); border-color: rgba(96,165,250,0.5); color: #60a5fa; }
.tag-remove { background: none; border: none; color: rgba(255,255,255,0.3); cursor: pointer; font-size: 14px; padding: 0 2px; line-height: 1; transition: color 0.2s; }
.tag-remove:hover { color: #ef4444; }
.add-companion-btn { background: none; border: 1px dashed rgba(255,255,255,0.15); border-radius: 20px; color: rgba(255,255,255,0.4); font-size: 12px; padding: 5px 14px; cursor: pointer; transition: all 0.2s; }
.add-companion-btn:hover { border-color: rgba(96,165,250,0.4); color: #60a5fa; }
.companion-input-row { display: flex; gap: 6px; }
.companion-input-row input { flex: 1; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 6px 10px; color: #e2e8f0; font-size: 13px; }
.companion-input-row input:focus { outline: none; border-color: rgba(96,165,250,0.5); }
.confirm-add, .cancel-add { width: 30px; height: 30px; border-radius: 8px; border: none; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
.confirm-add { background: rgba(16,185,129,0.2); color: #10b981; }
.confirm-add:hover { background: rgba(16,185,129,0.3); }
.cancel-add { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.5); }
.cancel-add:hover { background: rgba(255,255,255,0.1); }

.foot { display: flex; gap: 10px; padding: 16px 24px 20px; border-top: 1px solid rgba(255,255,255,0.08); flex-shrink: 0; }
.btn { flex: 1; padding: 12px; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; border: none; }
.cancel { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.75); border: 1px solid rgba(255,255,255,0.1); }
.cancel:hover { background: rgba(255,255,255,0.12); }
.primary { background: linear-gradient(135deg,#3b82f6,#8b5cf6); color: #fff; box-shadow: 0 4px 12px rgba(59,130,246,0.35); }
.primary:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(59,130,246,0.45); }
@media (max-width: 480px) {
  .modal { max-height: 95vh; border-radius: 16px; }
  .head, .body, .foot { padding-left: 16px; padding-right: 16px; }
  h3 { font-size: 16px; }
  .img-grid { gap: 6px; }
  .transport-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
