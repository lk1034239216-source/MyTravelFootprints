<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick, computed } from 'vue'
import * as echarts from 'echarts'
import { provinceConfig } from '../config/provinces.js'
import { provinceCities } from '../config/cityMap.js'
import { useTravelData, MARKER_TYPES } from '../composables/useTravelData.js'
import RecordForm from './RecordForm.vue'
import FootprintGallery from './FootprintGallery.vue'

const props = defineProps({ provinceName: { type: String, required: true } })
const emit = defineEmits(['back'])

const { getVisitCount, isVisited, addRecord, updateRecord, getSortedRecords, cityRecords, getRecords, getMarkers, hasMarker, toggleMarker, getMarkerIcons } = useTravelData()

const chartRef = ref(null)
let instance = null
const isLoading = ref(true)
const error = ref(null)

const showForm = ref(false)
const showGallery = ref(false)
const selectedCity = ref('')
const editingRecord = ref(null)
const isAddingNew = ref(false)
const markerCity = ref('')

const config = computed(() => provinceConfig[props.provinceName])

const SAR_MAP = {
  '香港特别行政区': { adcode: '810000', short: '香港' },
  '澳门特别行政区': { adcode: '820000', short: '澳门' }
}

const drillLevel = ref('province')
const drillName = ref('')
const displayCities = ref([])
const geoCache = {}

const isGuangdong = computed(() => props.provinceName === '广东')

const breadcrumb = computed(() => {
  const items = [{ label: '全国', action: () => emit('back') }]
  items.push({ label: config.value?.fullName || props.provinceName, action: drillLevel.value === 'sar' ? () => backToProvince() : null })
  if (drillLevel.value === 'sar' && drillName.value) {
    items.push({ label: SAR_MAP[drillName.value]?.short || drillName.value, action: null })
  }
  return items
})

const recentRecords = computed(() => {
  const all = []
  for (const city of displayCities.value) {
    getRecords(city).forEach((rec, idx) => { all.push({ ...rec, cityName: city, seq: idx + 1 }) })
  }
  return all.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 30)
})

const fmtDate = (d) => {
  if (!d) return '未知'
  const dt = new Date(d)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

const isSAR = (name) => !!SAR_MAP[name]

const buildSARFeature = (geo, shortName) => {
  const merged = { type: 'Feature', properties: { name: shortName }, geometry: { type: 'MultiPolygon', coordinates: [] } }
  for (const f of (geo.features || [])) {
    if (f.geometry?.type === 'Polygon') merged.geometry.coordinates.push([f.geometry.coordinates[0]])
    else if (f.geometry?.type === 'MultiPolygon') merged.geometry.coordinates.push(...f.geometry.coordinates)
  }
  return merged
}

const fetchGeo = async (adcode) => {
  const key = String(adcode)
  if (geoCache[key]) return geoCache[key]

  if (key === '710000') {
    const chinaResp = await fetch('/china.json')
    if (!chinaResp.ok) throw new Error('加载全国地图数据失败')
    const chinaGeo = await chinaResp.json()
    const taiwanFeature = chinaGeo.features.find(f => f.properties.name === '台湾省')
    if (!taiwanFeature) throw new Error('未找到台湾省数据')
    const taiwanGeo = { type: 'FeatureCollection', features: [taiwanFeature] }
    geoCache[key] = taiwanGeo
    return taiwanGeo
  }

  const resp = await fetch(`https://geo.datav.aliyun.com/areas_v3/bound/${key}_full.json`)
  if (!resp.ok) throw new Error(`加载地图 ${adcode} 失败`)
  geoCache[key] = await resp.json()
  return geoCache[key]
}

const visitColor = (count) => {
  if (count === 0) return undefined
  if (count === 1) return {
    areaColor: { type: 'linear', x: 0, y: 0, x2: 1, y2: 1, colorStops: [{ offset: 0, color: 'rgba(56,189,248,0.55)' }, { offset: 1, color: 'rgba(99,102,241,0.45)' }] },
    borderColor: '#38bdf8', borderWidth: 2, shadowColor: 'rgba(56,189,248,0.5)', shadowBlur: 12
  }
  if (count === 2) return {
    areaColor: { type: 'linear', x: 0, y: 0, x2: 1, y2: 1, colorStops: [{ offset: 0, color: 'rgba(234,179,8,0.6)' }, { offset: 1, color: 'rgba(249,115,22,0.5)' }] },
    borderColor: '#fbbf24', borderWidth: 2, shadowColor: 'rgba(234,179,8,0.5)', shadowBlur: 14
  }
  return {
    areaColor: { type: 'linear', x: 0, y: 0, x2: 1, y2: 1, colorStops: [{ offset: 0, color: 'rgba(239,68,68,0.65)' }, { offset: 0.5, color: 'rgba(234,179,8,0.6)' }, { offset: 1, color: 'rgba(249,115,22,0.55)' }] },
    borderColor: '#ef4444', borderWidth: 2, shadowColor: 'rgba(239,68,68,0.5)', shadowBlur: 16
  }
}

const sarBlockColor = (sarName) => {
  const cityList = provinceCities[sarName] || []
  const total = cityList.reduce((s, c) => s + getVisitCount(c), 0)
  if (total === 0) return { areaColor: 'rgba(88,60,130,0.45)', borderColor: 'rgba(168,85,247,0.5)', borderWidth: 2, borderType: 'dashed' }
  if (total <= 3) return { areaColor: 'rgba(124,58,237,0.4)', borderColor: '#a855f7', borderWidth: 2.5, borderType: 'dashed', shadowColor: 'rgba(168,85,247,0.3)', shadowBlur: 10 }
  if (total <= 8) return { areaColor: 'rgba(168,85,247,0.45)', borderColor: '#a855f7', borderWidth: 2.5, borderType: 'dashed', shadowColor: 'rgba(168,85,247,0.4)', shadowBlur: 12 }
  return { areaColor: 'rgba(192,132,252,0.5)', borderColor: '#c084fc', borderWidth: 3, borderType: 'dashed', shadowColor: 'rgba(168,85,247,0.5)', shadowBlur: 16 }
}

const buildOption = (mapName) => {
  const regions = displayCities.value.map(city => {
    if (drillLevel.value === 'province' && isGuangdong.value && SAR_MAP[city]) {
      return { name: city, itemStyle: sarBlockColor(city) }
    }
    return { name: city, itemStyle: visitColor(getVisitCount(city)) }
  })

  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(15,23,42,0.95)',
      borderColor: 'rgba(96,165,250,0.3)',
      borderWidth: 1,
      padding: [12, 16],
      textStyle: { color: '#e2e8f0', fontSize: 13 },
      formatter: p => {
        const name = p.name
        if (drillLevel.value === 'province' && isGuangdong.value && SAR_MAP[name]) {
          const sar = SAR_MAP[name]
          const cityList = provinceCities[name] || []
          const visited = cityList.filter(c => getVisitCount(c) > 0).length
          const total = cityList.reduce((s, c) => s + getVisitCount(c), 0)
          return `<div style="font-weight:600;font-size:14px">${sar.short} <span style="font-size:10px;color:#a855f7;background:rgba(168,85,247,0.15);padding:1px 6px;border-radius:4px">特别行政区</span></div>` +
            `<div style="color:#c084fc;margin-top:4px">🔍 点击查看内部区域</div>` +
            `<div style="font-size:12px;color:rgba(255,255,255,0.45);margin-top:3px">已到访 ${visited}/${cityList.length} 区 · 共 ${total} 次</div>`
        }
        const count = getVisitCount(name)
        let h = `<div style="font-weight:600;font-size:14px">${name}</div>`
        if (count > 0) h += `<div style="color:#4ade80;margin-top:3px">✅ 到访 ${count} 次</div>`
        else h += `<div style="color:rgba(255,255,255,0.45);margin-top:3px">📍 未到访</div>`
        return h
      }
    },
    geo: {
      map: mapName,
      roam: true,
      scaleLimit: { min: 0.5, max: 10 },
      left: 'center',
      top: 'center',
      itemStyle: {
        areaColor: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(51,65,85,0.7)' }, { offset: 1, color: 'rgba(30,41,59,0.5)' }] },
        borderColor: 'rgba(148,163,184,0.25)', borderWidth: 1
      },
      emphasis: {
        itemStyle: {
          areaColor: { type: 'linear', x: 0, y: 0, x2: 1, y2: 1, colorStops: [{ offset: 0, color: 'rgba(59,130,246,0.6)' }, { offset: 1, color: 'rgba(147,51,234,0.5)' }] },
          borderColor: '#60a5fa', borderWidth: 2
        },
        label: { show: true, color: '#fff', fontSize: 12, fontWeight: 600 }
      },
      label: { show: true, color: 'rgba(255,255,255,0.55)', fontSize: 10 },
      select: { disabled: true },
      regions
    },
    series: []
  }
}

const switchMap = async (mapName, geo) => {
  if (!instance) return
  try {
    console.log(`[switchMap] → ${mapName}`)
    instance.clear()
    echarts.registerMap(mapName, geo)
    displayCities.value = geo.features.map(f => f.properties.name)
    instance.setOption(buildOption(mapName), true)
    instance.off('click')
    instance.on('click', p => {
      if (p.componentType !== 'geo') return
      if (drillLevel.value === 'province' && isGuangdong.value && SAR_MAP[p.name]) {
        drillIntoSAR(p.name)
      } else {
        handleCityClick(p.name)
      }
    })
    requestAnimationFrame(() => { instance?.resize(); requestAnimationFrame(() => instance?.resize()) })
    console.log(`[switchMap] ✓ ${mapName}, cities: ${displayCities.value.length}`)
  } catch (e) {
    console.error('[switchMap] 失败:', e)
    error.value = e.message
  }
}

const initChart = async () => {
  if (!chartRef.value || !config.value) return
  isLoading.value = true; error.value = null

  try {
    instance = echarts.init(chartRef.value)
    const geo = await fetchGeo(config.value.adcode)

    if (isGuangdong.value) {
      const gdGeo = JSON.parse(JSON.stringify(geo))
      const [hkGeo, moGeo] = await Promise.all([fetchGeo('810000'), fetchGeo('820000')])
      gdGeo.features.push(buildSARFeature(hkGeo, '香港特别行政区'))
      gdGeo.features.push(buildSARFeature(moGeo, '澳门特别行政区'))
      drillLevel.value = 'province'
      drillName.value = ''
      await switchMap(`province_${props.provinceName}`, gdGeo)
    } else {
      drillLevel.value = 'province'
      drillName.value = ''
      await switchMap(`province_${props.provinceName}`, geo)
    }
  } catch (e) {
    console.error('[initChart] 失败:', e)
    error.value = e.message
  } finally {
    isLoading.value = false
  }
}

const drillIntoSAR = async (sarName) => {
  const sarConfig = SAR_MAP[sarName]
  if (!sarConfig) return
  try {
    isLoading.value = true
    const geo = await fetchGeo(sarConfig.adcode)
    drillLevel.value = 'sar'
    drillName.value = sarName
    await switchMap(`sar_${sarConfig.adcode}`, geo)
  } catch (e) {
    console.error('[drillIntoSAR] 失败:', e)
    error.value = e.message
  } finally {
    isLoading.value = false
  }
}

const backToProvince = async () => {
  if (drillLevel.value === 'province') return
  try {
    isLoading.value = true
    const geo = await fetchGeo(config.value.adcode)

    if (isGuangdong.value) {
      const gdGeo = JSON.parse(JSON.stringify(geo))
      const [hkGeo, moGeo] = await Promise.all([fetchGeo('810000'), fetchGeo('820000')])
      gdGeo.features.push(buildSARFeature(hkGeo, '香港特别行政区'))
      gdGeo.features.push(buildSARFeature(moGeo, '澳门特别行政区'))
      drillLevel.value = 'province'
      drillName.value = ''
      await switchMap(`province_${props.provinceName}_back`, gdGeo)
    } else {
      drillLevel.value = 'province'
      drillName.value = ''
      await switchMap(`province_${props.provinceName}_back`, geo)
    }
  } catch (e) {
    console.error('[backToProvince] 失败:', e)
    error.value = e.message
  } finally {
    isLoading.value = false
  }
}

const handleCityClick = (cityName) => {
  if (drillLevel.value === 'province' && isGuangdong.value && SAR_MAP[cityName]) {
    drillIntoSAR(cityName)
    return
  }
  selectedCity.value = cityName
  const count = getVisitCount(cityName)
  if (count === 0) { editingRecord.value = null; isAddingNew.value = false; showForm.value = true }
  else { showGallery.value = true }
}

const handleSave = (cityName, data) => {
  if (editingRecord.value) updateRecord(cityName, editingRecord.value.id, data)
  else addRecord(cityName, data)
  showForm.value = false; editingRecord.value = null; isAddingNew.value = false
  nextTick(() => { instance?.setOption(buildOption(currentMapName())) })
}

const currentMapName = () => {
  if (drillLevel.value === 'sar') {
    const sar = SAR_MAP[drillName.value]
    return sar ? `sar_${sar.adcode}` : ''
  }
  return `province_${props.provinceName}`
}

const handleCloseForm = () => { showForm.value = false; editingRecord.value = null; isAddingNew.value = false }
const handleAddNew = () => { showGallery.value = false; editingRecord.value = null; isAddingNew.value = true; showForm.value = true }
const handleEditRecord = (record) => { showGallery.value = false; editingRecord.value = record; isAddingNew.value = false; showForm.value = true }
const handleCloseGallery = () => { showGallery.value = false; selectedCity.value = '' }
const handleFeedClick = (item) => { selectedCity.value = item.cityName; showGallery.value = true }

watch(cityRecords, () => { nextTick(() => { instance?.setOption(buildOption(currentMapName())) }) }, { deep: true })

let ro = null
const handleResize = () => instance?.resize()
onMounted(() => {
  nextTick(initChart)
  window.addEventListener('resize', handleResize)
  ro = new ResizeObserver(() => instance?.resize())
  if (chartRef.value) ro.observe(chartRef.value)
})
onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  ro?.disconnect()
  instance?.dispose()
  instance = null
})
</script>

<template>
  <div class="province-detail">
    <div class="header">
      <div class="breadcrumb">
        <template v-for="(item, i) in breadcrumb" :key="i">
          <span v-if="i > 0" class="bc-sep">›</span>
          <button v-if="item.action" class="bc-link" @click="item.action">{{ item.label }}</button>
          <span v-else class="bc-current">{{ item.label }}</span>
        </template>
      </div>
    </div>

    <div class="two-col">
      <div class="col-left">
        <div class="map-card">
          <div v-if="isLoading" class="loading"><div class="spinner"></div></div>
          <div v-else-if="error" class="err">
            <p>⚠️ {{ error }}</p>
            <button @click="initChart">重试</button>
          </div>
          <div class="chart" ref="chartRef" :style="{ display: isLoading || error ? 'none' : 'block' }"></div>
        </div>

        <div class="legend">
          <div class="leg-item"><span class="dot gray"></span>未到访</div>
          <div class="leg-item"><span class="dot blue"></span>1 次</div>
          <div class="leg-item"><span class="dot gold"></span>2 次</div>
          <div class="leg-item"><span class="dot red"></span>3+</div>
          <div v-if="drillLevel === 'province' && isGuangdong" class="leg-item"><span class="dot purple"></span>港澳区块</div>
        </div>
      </div>

      <div class="col-right">
        <div class="feed-card">
          <div class="feed-head">
            <span class="feed-title">📋 旅行记录</span>
            <span class="feed-count" v-if="recentRecords.length">{{ recentRecords.length }} 条</span>
          </div>

          <div v-if="recentRecords.length === 0" class="feed-empty">
            <span>📭</span>
            <p>暂无记录，点击地图上的城市开始记录</p>
          </div>

          <div v-else class="feed-list">
            <div v-for="rec in recentRecords" :key="rec.id" class="feed-item" @click="handleFeedClick(rec)">
              <div class="feed-dot"></div>
              <div class="feed-text">
                <span class="feed-date">{{ fmtDate(rec.date) }}</span>
                <span class="feed-desc">第 <b>{{ rec.seq }}</b> 次来到 <b>{{ rec.cityName.replace('特别行政区', '') }}</b></span>
                <span v-if="rec.thoughts" class="feed-thought">{{ rec.thoughts.slice(0, 40) }}{{ rec.thoughts.length > 40 ? '...' : '' }}</span>
              </div>
              <span v-if="rec.images?.length" class="feed-photo">📸{{ rec.images.length }}</span>
            </div>
          </div>
        </div>

        <div class="cities-grid" v-if="displayCities.length">
          <div class="grid-head">{{ drillLevel === 'sar' ? '区域列表' : '地市列表' }} <span class="grid-hint">· 右键标记</span></div>
          <div class="grid">
            <div v-for="city in displayCities" :key="city" class="city-card" :class="{ visited: isVisited(city), marked: getMarkers(city).length > 0 }" @click="handleCityClick(city)" @contextmenu.prevent="markerCity = city">
              <div class="card-left">
                <div class="marker-icons" v-if="getMarkerIcons(city).length">
                  <span v-for="m in getMarkerIcons(city)" :key="m.key" class="marker-icon">{{ m.icon }}</span>
                </div>
                <span class="city-name">{{ city.replace('特别行政区', '') }}</span>
              </div>
              <span v-if="getVisitCount(city) > 0" class="badge" :class="{ many: getVisitCount(city) >= 2 }">{{ getVisitCount(city) }}次</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <Transition name="marker-pop">
        <div v-if="markerCity" class="marker-overlay" @click.self="markerCity = ''">
          <div class="marker-popup">
            <div class="marker-popup-head">
              <span>📍 标记 {{ markerCity }}</span>
              <button class="marker-close" @click="markerCity = ''">✕</button>
            </div>
            <div class="marker-list">
              <div v-for="m in MARKER_TYPES" :key="m.key" class="marker-option" :class="{ active: hasMarker(markerCity, m.key) }" @click="toggleMarker(markerCity, m.key)">
                <span class="marker-opt-icon">{{ m.icon }}</span>
                <span class="marker-opt-label">{{ m.label }}</span>
                <span class="marker-check">{{ hasMarker(markerCity, m.key) ? '✓' : '' }}</span>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <RecordForm v-if="showForm" :cityName="selectedCity" :record="editingRecord" :isAddingNew="isAddingNew" @save="handleSave" @close="handleCloseForm" />
    <FootprintGallery v-if="showGallery" :cityName="selectedCity" @add="handleAddNew" @edit="handleEditRecord" @close="handleCloseGallery" />
  </div>
</template>

<style scoped>
.province-detail { display: flex; flex-direction: column; gap: 18px; }
.header { display: flex; align-items: center; }
.breadcrumb { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.bc-link { background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 6px 12px; color: #e2e8f0; font-size: 13px; cursor: pointer; transition: all 0.2s; }
.bc-link:hover { background: rgba(255,255,255,0.12); border-color: rgba(96,165,250,0.4); }
.bc-sep { color: rgba(255,255,255,0.25); font-size: 16px; }
.bc-current { font-size: 20px; font-weight: 700; background: linear-gradient(135deg,#60a5fa,#a78bfa); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }

.two-col { display: grid; grid-template-columns: 1fr 380px; gap: 18px; align-items: start; }
.col-left { display: flex; flex-direction: column; gap: 10px; }
.col-right { display: flex; flex-direction: column; gap: 12px; max-height: calc(70vh + 44px); }
.map-card { background: rgba(255,255,255,0.03); border-radius: 18px; border: 1px solid rgba(255,255,255,0.07); padding: 4px; position: relative; overflow: hidden; min-height: 460px; }
.map-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px; background: linear-gradient(90deg, transparent, rgba(96,165,250,0.25), transparent); z-index: 1; }
.chart { width: 100%; height: 70vh; min-height: 460px; }
.loading { display: flex; align-items: center; justify-content: center; height: 460px; }
.spinner { width: 36px; height: 36px; border: 3px solid rgba(96,165,250,0.2); border-top-color: #60a5fa; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.err { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 460px; color: rgba(255,255,255,0.5); }
.err button { margin-top: 10px; padding: 7px 18px; background: linear-gradient(135deg,#3b82f6,#8b5cf6); border: none; border-radius: 8px; color: #fff; cursor: pointer; font-size: 13px; }

.legend { display: flex; justify-content: center; gap: 14px; padding: 8px; background: rgba(255,255,255,0.03); border-radius: 10px; flex-wrap: wrap; }
.leg-item { display: flex; align-items: center; gap: 5px; font-size: 11px; color: rgba(255,255,255,0.45); }
.dot { width: 12px; height: 12px; border-radius: 3px; }
.dot.gray { background: rgba(51,65,85,0.7); border: 1px solid rgba(148,163,184,0.25); }
.dot.blue { background: linear-gradient(135deg, rgba(56,189,248,0.55), rgba(99,102,241,0.45)); border: 1px solid #38bdf8; }
.dot.gold { background: linear-gradient(135deg, rgba(234,179,8,0.6), rgba(249,115,22,0.5)); border: 1px solid #fbbf24; }
.dot.red { background: linear-gradient(135deg, rgba(239,68,68,0.65), rgba(234,179,8,0.6)); border: 1px solid #ef4444; }
.dot.purple { background: rgba(124,58,237,0.4); border: 1px dashed #a855f7; }

.feed-card { background: rgba(255,255,255,0.03); border-radius: 14px; border: 1px solid rgba(255,255,255,0.07); padding: 14px; flex: 1; min-height: 0; display: flex; flex-direction: column; }
.feed-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; flex-shrink: 0; }
.feed-title { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.75); }
.feed-count { font-size: 10px; color: rgba(255,255,255,0.35); background: rgba(255,255,255,0.05); padding: 2px 8px; border-radius: 8px; }
.feed-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 28px 0; color: rgba(255,255,255,0.3); }
.feed-empty span { font-size: 28px; margin-bottom: 6px; }
.feed-empty p { font-size: 11px; margin: 0; }
.feed-list { overflow-y: auto; flex: 1; min-height: 0; display: flex; flex-direction: column; gap: 1px; }
.feed-list::-webkit-scrollbar { width: 3px; }
.feed-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
.feed-item { display: flex; align-items: flex-start; gap: 8px; padding: 8px 6px; border-radius: 8px; cursor: pointer; transition: background 0.15s; }
.feed-item:hover { background: rgba(255,255,255,0.04); }
.feed-dot { width: 6px; height: 6px; background: linear-gradient(135deg,#60a5fa,#a78bfa); border-radius: 50%; flex-shrink: 0; margin-top: 5px; box-shadow: 0 0 6px rgba(96,165,250,0.3); }
.feed-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.feed-date { font-size: 10px; color: rgba(255,255,255,0.35); font-variant-numeric: tabular-nums; }
.feed-desc { font-size: 12px; color: rgba(255,255,255,0.75); line-height: 1.35; }
.feed-desc b { color: #60a5fa; font-weight: 600; }
.feed-thought { font-size: 10px; color: rgba(255,255,255,0.3); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.feed-photo { font-size: 10px; color: rgba(255,255,255,0.4); background: rgba(255,255,255,0.05); padding: 1px 5px; border-radius: 5px; flex-shrink: 0; margin-top: 3px; }

.cities-grid { background: rgba(255,255,255,0.03); border-radius: 12px; border: 1px solid rgba(255,255,255,0.07); padding: 12px; flex-shrink: 0; }
.grid-head { font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.6); margin-bottom: 8px; }
.grid-hint { font-size: 11px; color: rgba(255,255,255,0.3); font-weight: 400; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(88px, 1fr)); gap: 5px; }
.city-card { display: flex; align-items: center; justify-content: space-between; padding: 6px 8px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07); border-radius: 7px; cursor: pointer; transition: all 0.2s; }
.city-card:hover { background: rgba(255,255,255,0.07); border-color: rgba(96,165,250,0.3); }
.city-card.visited { background: rgba(56,189,248,0.07); border-color: rgba(56,189,248,0.2); }
.city-card.marked { border-color: rgba(168,85,247,0.3); }
.card-left { display: flex; align-items: center; gap: 4px; min-width: 0; }
.marker-icons { display: flex; gap: 1px; flex-shrink: 0; }
.marker-icon { font-size: 12px; line-height: 1; }
.city-name { font-size: 11px; color: rgba(255,255,255,0.75); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.city-card.visited .city-name { color: #38bdf8; }
.badge { font-size: 9px; padding: 1px 5px; border-radius: 6px; font-weight: 600; background: rgba(56,189,248,0.15); color: #38bdf8; flex-shrink: 0; }
.badge.many { background: rgba(234,179,8,0.2); color: #fbbf24; }

.marker-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
.marker-popup { background: linear-gradient(145deg,#1e293b,#0f172a); border: 1px solid rgba(96,165,250,0.2); border-radius: 16px; width: 300px; box-shadow: 0 20px 50px rgba(0,0,0,0.5); overflow: hidden; }
.marker-popup-head { display: flex; align-items: center; justify-content: space-between; padding: 16px 18px; border-bottom: 1px solid rgba(255,255,255,0.08); font-size: 15px; font-weight: 600; color: rgba(255,255,255,0.85); }
.marker-close { background: rgba(255,255,255,0.08); border: none; color: rgba(255,255,255,0.5); width: 28px; height: 28px; border-radius: 50%; cursor: pointer; font-size: 13px; transition: all 0.2s; }
.marker-close:hover { background: rgba(255,255,255,0.15); color: #fff; }
.marker-list { padding: 8px; }
.marker-option { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 10px; cursor: pointer; transition: background 0.15s; }
.marker-option:hover { background: rgba(255,255,255,0.05); }
.marker-option.active { background: rgba(96,165,250,0.1); }
.marker-opt-icon { font-size: 20px; flex-shrink: 0; }
.marker-opt-label { flex: 1; font-size: 14px; color: rgba(255,255,255,0.75); }
.marker-check { font-size: 14px; color: #60a5fa; font-weight: 700; width: 20px; text-align: center; }
.marker-pop-enter-active { transition: all 0.2s ease; }
.marker-pop-leave-active { transition: all 0.15s ease; }
.marker-pop-enter-from, .marker-pop-leave-to { opacity: 0; }

@media (max-width: 900px) {
  .two-col { grid-template-columns: 1fr; }
  .col-right { max-height: none; }
  .chart { height: 55vh; min-height: 320px; }
  .map-card { min-height: 320px; }
  .loading, .err { height: 320px; }
}
@media (max-width: 768px) {
  .breadcrumb { gap: 6px; }
  .bc-link { padding: 5px 10px; font-size: 12px; }
  .bc-current { font-size: 18px; }
  .map-card { padding: 4px; min-height: 280px; }
  .chart { height: 48vh; min-height: 280px; }
  .loading, .err { height: 280px; }
  .grid { grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); }
}
</style>
