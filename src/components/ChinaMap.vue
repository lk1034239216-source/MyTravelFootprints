<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import * as echarts from 'echarts'
import { useTravelData, MARKER_TYPES } from '../composables/useTravelData.js'

const emit = defineEmits(['province-click'])

const { cityRecords, cityMarkers, getProvinceProgress, getAllRoutes } = useTravelData()
const chartRef = ref(null)
let chart = null
let geoData = null
let cityCoords = {}
const activeLayer = ref('none')

const fullNameToShort = {
  '北京市': '北京', '天津市': '天津', '上海市': '上海', '重庆市': '重庆',
  '河北省': '河北', '山西省': '山西', '辽宁省': '辽宁', '吉林省': '吉林',
  '黑龙江省': '黑龙江', '江苏省': '江苏', '浙江省': '浙江', '安徽省': '安徽',
  '福建省': '福建', '江西省': '江西', '山东省': '山东', '河南省': '河南',
  '湖北省': '湖北', '湖南省': '湖南', '广东省': '广东', '海南省': '海南',
  '四川省': '四川', '贵州省': '贵州', '云南省': '云南', '陕西省': '陕西',
  '甘肃省': '甘肃', '青海省': '青海', '台湾省': '台湾',
  '内蒙古自治区': '内蒙古', '广西壮族自治区': '广西', '西藏自治区': '西藏',
  '宁夏回族自治区': '宁夏', '新疆维吾尔自治区': '新疆',
  '香港特别行政区': '香港', '澳门特别行政区': '澳门'
}

const SAR_PROVINCES = { '香港': '广东', '澳门': '广东' }
const allProvinces = Object.values(fullNameToShort).filter((v, i, a) => a.indexOf(v) === i)

const MARKER_STYLES = {
  home:     { color: '#f59e0b', symbolSize: 18 },
  school:   { color: '#8b5cf6', symbolSize: 18 },
  work:     { color: '#3b82f6', symbolSize: 18 },
  hometown: { color: '#10b981', symbolSize: 20 },
  wish:     { color: '#ec4899', symbolSize: 16 }
}

const TRANSPORT_COLORS = {
  plane: '#38bdf8',
  train: '#fbbf24',
  car: '#4ade80',
  other: '#a78bfa'
}

const MUNICIPALITY_MAP = {
  '东城区':'北京','西城区':'北京','朝阳区':'北京','丰台区':'北京','石景山区':'北京','海淀区':'北京',
  '门头沟区':'北京','房山区':'北京','通州区':'北京','顺义区':'北京','昌平区':'北京','大兴区':'北京',
  '怀柔区':'北京','平谷区':'北京','密云区':'北京','延庆区':'北京',
  '和平区':'天津','河东区':'天津','河西区':'天津','南开区':'天津','河北区':'天津','红桥区':'天津',
  '东丽区':'天津','西青区':'天津','津南区':'天津','北辰区':'天津','武清区':'天津','宝坻区':'天津',
  '滨海新区':'天津','宁河区':'天津','静海区':'天津','蓟州区':'天津',
  '黄浦区':'上海','徐汇区':'上海','长宁区':'上海','静安区':'上海','普陀区':'上海','虹口区':'上海',
  '杨浦区':'上海','闵行区':'上海','宝山区':'上海','嘉定区':'上海','浦东新区':'上海','金山区':'上海',
  '松江区':'上海','青浦区':'上海','奉贤区':'上海','崇明区':'上海',
  '万州区':'重庆','涪陵区':'重庆','渝中区':'重庆','大渡口区':'重庆','江北区':'重庆','沙坪坝区':'重庆',
  '九龙坡区':'重庆','南岸区':'重庆','北碚区':'重庆','綦江区':'重庆','大足区':'重庆','渝北区':'重庆',
  '巴南区':'重庆','黔江区':'重庆','长寿区':'重庆','江津区':'重庆','合川区':'重庆','永川区':'重庆',
  '南川区':'重庆','璧山区':'重庆','铜梁区':'重庆','潼南区':'重庆','荣昌区':'重庆','开州区':'重庆',
  '梁平区':'重庆','武隆区':'重庆','城口县':'重庆','丰都县':'重庆','垫江县':'重庆','忠县':'重庆',
  '云阳县':'重庆','奉节县':'重庆','巫山县':'重庆','巫溪县':'重庆',
  '石柱土家族自治县':'重庆','秀山土家族苗族自治县':'重庆','酉阳土家族苗族自治县':'重庆','彭水苗族土家族自治县':'重庆',
  '香港特别行政区':'香港','澳门特别行政区':'澳门'
}

const normalizeCityName = (name) => MUNICIPALITY_MAP[name] || name

const loadCoords = async () => {
  try {
    const resp = await fetch('/city-coords.json')
    if (!resp.ok) { console.error('[ChinaMap] city-coords.json 加载失败'); return }
    cityCoords = await resp.json()
    console.log(`[ChinaMap] 城市坐标加载完成: ${Object.keys(cityCoords).length} 个城市`)
  } catch (e) { console.error('[ChinaMap] 城市坐标加载失败:', e) }
}

const buildAllSeries = () => {
  const series = []
  const layer = activeLayer.value

  if (layer === 'markers' || layer === 'both') {
    for (const markerType of MARKER_TYPES) {
      const data = []
      for (const [cityName, types] of Object.entries(cityMarkers.value)) {
        if (!types.includes(markerType.key)) continue
        const coord = cityCoords[cityName]
        if (!coord) continue
        data.push({ name: cityName, value: [...coord, cityName] })
      }
      if (data.length === 0) continue
      const style = MARKER_STYLES[markerType.key] || { color: '#fff', symbolSize: 16 }
      series.push({
        name: markerType.label,
        type: 'effectScatter',
        coordinateSystem: 'geo',
        data,
        symbolSize: style.symbolSize,
        showEffectOn: 'render',
        rippleEffect: { brushType: 'stroke', scale: 3, period: 4 },
        itemStyle: { color: style.color, shadowColor: style.color, shadowBlur: 8 },
        label: { show: true, formatter: p => p.value[2], position: 'right', distance: 8, fontSize: 11, color: 'rgba(255,255,255,0.8)', textShadowColor: 'rgba(0,0,0,0.6)', textShadowBlur: 4 },
        tooltip: {
          backgroundColor: 'rgba(15,23,42,0.95)', borderColor: 'rgba(96,165,250,0.3)', borderWidth: 1, padding: [10, 14], textStyle: { color: '#e2e8f0', fontSize: 13 },
          formatter: p => {
            const city = p.value[2], types = cityMarkers.value[city] || []
            const icons = types.map(t => MARKER_TYPES.find(m => m.key === t)).filter(Boolean)
            return `<div style="font-weight:600;font-size:14px;margin-bottom:6px">${city}</div>` + icons.map(m => `<div style="margin:2px 0">${m.icon} ${m.label}</div>`).join('')
          }
        }
      })
    }
  }

  if (layer === 'routes' || layer === 'both') {
    const routes = getAllRoutes()
    const linesData = routes.map(r => {
      const from = normalizeCityName(r.from)
      const to = normalizeCityName(r.to)
      if (from === to) return null
      const fromCoord = cityCoords[from]
      const toCoord = cityCoords[to]
      if (!fromCoord || !toCoord) return null
      return { coords: [fromCoord, toCoord], transport: r.transport, from, to }
    }).filter(Boolean)

    if (linesData.length > 0) {
      series.push({
        name: '旅行航线',
        type: 'lines',
        coordinateSystem: 'geo',
        zlevel: 1,
        data: linesData.map(d => ({
          coords: d.coords,
          lineStyle: { color: TRANSPORT_COLORS[d.transport] || TRANSPORT_COLORS.other, opacity: 0.5, width: 1.5, curveness: 0.2 }
        })),
        effect: { show: true, period: 4, trailLength: 0.6, symbol: 'circle', symbolSize: 4, color: '#fff' },
        lineStyle: { curveness: 0.2, opacity: 0.4 },
        tooltip: {
          backgroundColor: 'rgba(15,23,42,0.95)', borderColor: 'rgba(96,165,250,0.3)', borderWidth: 1, padding: [10, 14], textStyle: { color: '#e2e8f0', fontSize: 13 },
          formatter: p => {
            const d = linesData[p.dataIndex]
            if (!d) return ''
            const icons = { plane: '✈️', train: '🚄', car: '🚗', other: '🗺️' }
            return `<div style="font-weight:600;font-size:14px">${d.from} → ${d.to}</div><div style="margin-top:4px">${icons[d.transport] || '🗺️'} ${d.transport}</div>`
          }
        }
      })
    }
  }

  return series
}

const percentColor = (pct) => {
  if (pct === 0) return { areaColor: 'rgba(51,65,85,0.6)', borderColor: 'rgba(148,163,184,0.2)', borderWidth: 1 }
  if (pct <= 20) return { areaColor: { type: 'linear', x: 0, y: 0, x2: 1, y2: 1, colorStops: [{ offset: 0, color: 'rgba(56,189,248,0.35)' }, { offset: 1, color: 'rgba(99,102,241,0.25)' }] }, borderColor: 'rgba(56,189,248,0.4)', borderWidth: 1.5 }
  if (pct <= 50) return { areaColor: { type: 'linear', x: 0, y: 0, x2: 1, y2: 1, colorStops: [{ offset: 0, color: 'rgba(56,189,248,0.55)' }, { offset: 1, color: 'rgba(99,102,241,0.45)' }] }, borderColor: '#38bdf8', borderWidth: 2, shadowColor: 'rgba(56,189,248,0.3)', shadowBlur: 8 }
  if (pct <= 80) return { areaColor: { type: 'linear', x: 0, y: 0, x2: 1, y2: 1, colorStops: [{ offset: 0, color: 'rgba(234,179,8,0.55)' }, { offset: 1, color: 'rgba(249,115,22,0.45)' }] }, borderColor: '#fbbf24', borderWidth: 2, shadowColor: 'rgba(234,179,8,0.4)', shadowBlur: 10 }
  return { areaColor: { type: 'linear', x: 0, y: 0, x2: 1, y2: 1, colorStops: [{ offset: 0, color: 'rgba(239,68,68,0.6)' }, { offset: 0.5, color: 'rgba(234,179,8,0.55)' }, { offset: 1, color: 'rgba(249,115,22,0.5)' }] }, borderColor: '#ef4444', borderWidth: 2, shadowColor: 'rgba(239,68,68,0.4)', shadowBlur: 12 }
}

const initChart = async () => {
  if (!chartRef.value) return
  chart = echarts.init(chartRef.value)
  try {
    await loadCoords()
    console.log('[ChinaMap] 加载 /china.json')
    const resp = await fetch('/china.json')
    if (!resp.ok) throw new Error(`加载全国地图失败 (HTTP ${resp.status})`)
    geoData = await resp.json()
    console.log(`[ChinaMap] 加载成功, features=${geoData.features?.length}`)
    geoData.features.forEach(f => { f.properties.name = fullNameToShort[f.properties.name] || f.properties.name })
    echarts.registerMap('china', geoData)
    updateOption()
    chart.on('click', p => {
      if (p.componentType === 'geo') {
        const target = SAR_PROVINCES[p.name] || p.name
        emit('province-click', target)
      }
    })
  } catch (e) { console.error('[ChinaMap] 内核失败:', e) }
  requestAnimationFrame(() => { chart?.resize(); requestAnimationFrame(() => chart?.resize()) })
}

const updateOption = () => {
  if (!chart) return
  const regions = allProvinces.map(name => {
    const provinceName = SAR_PROVINCES[name] || name
    const { percent } = getProvinceProgress(provinceName)
    const isSAR = !!SAR_PROVINCES[name]
    const base = percentColor(percent)
    if (isSAR && percent === 0) { base.areaColor = 'rgba(88,60,130,0.45)'; base.borderColor = 'rgba(168,85,247,0.4)'; base.borderWidth = 1.5; base.borderType = 'dashed' }
    else if (isSAR) { base.borderColor = '#a855f7'; base.borderType = 'dashed' }
    return { name, itemStyle: base }
  })

  const markerSeries = buildAllSeries()
  console.log(`[ChinaMap] 系列数: ${markerSeries.length}`)

  chart.setOption({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(15,23,42,0.95)', borderColor: 'rgba(96,165,250,0.3)', borderWidth: 1, padding: [14, 18], textStyle: { color: '#e2e8f0', fontSize: 14 },
      formatter: p => {
        if (p.seriesType === 'effectScatter' || p.seriesType === 'lines') {
          const s = markerSeries.find(s => s.name === p.seriesName)
          if (s?.tooltip?.formatter) return s.tooltip.formatter(p)
          return p.name || ''
        }
        const name = p.name, isSAR = !!SAR_PROVINCES[name], provinceName = SAR_PROVINCES[name] || name
        const { visited, total, percent } = getProvinceProgress(provinceName)
        let h = `<div style="font-weight:600;font-size:15px;margin-bottom:6px">${name}${isSAR ? ' <span style="font-size:11px;color:#a855f7;background:rgba(168,85,247,0.15);padding:1px 6px;border-radius:4px">属广东</span>' : ''}</div>`
        if (total > 0) {
          const barColor = percent === 0 ? '#475569' : percent <= 20 ? '#38bdf8' : percent <= 50 ? '#38bdf8' : percent <= 80 ? '#fbbf24' : '#ef4444'
          h += `<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px"><div style="flex:1;height:6px;background:rgba(255,255,255,0.1);border-radius:3px;overflow:hidden"><div style="height:100%;width:${percent}%;background:${barColor};border-radius:3px"></div></div><span style="font-size:13px;font-weight:700;color:${barColor}">${percent}%</span></div>`
          h += `<div style="font-size:12px;color:rgba(255,255,255,0.5)">已到访 ${visited} / ${total} 个城市</div>`
        } else { h += `<div style="color:rgba(255,255,255,0.45)">点击进入查看城市</div>` }
        return h
      }
    },
    legend: {
      show: markerSeries.length > 0, bottom: 10, left: 'center', itemWidth: 12, itemHeight: 12,
      textStyle: { color: 'rgba(255,255,255,0.6)', fontSize: 11 },
      data: markerSeries.map(s => ({ name: s.name, icon: 'circle' }))
    },
    geo: {
      map: 'china', roam: true, zoom: 1.2, center: [104, 36], scaleLimit: { min: 0.8, max: 5 }, left: 'center', top: 'center',
      itemStyle: { areaColor: 'rgba(51,65,85,0.6)', borderColor: 'rgba(148,163,184,0.2)', borderWidth: 1 },
      emphasis: {
        itemStyle: { areaColor: { type: 'linear', x: 0, y: 0, x2: 1, y2: 1, colorStops: [{ offset: 0, color: 'rgba(59,130,246,0.65)' }, { offset: 1, color: 'rgba(147,51,234,0.55)' }] }, borderColor: '#60a5fa', borderWidth: 2, shadowColor: 'rgba(96,165,250,0.4)', shadowBlur: 15 },
        label: { show: true, color: '#fff', fontSize: 13, fontWeight: 600 }
      },
      label: { show: false }, select: { disabled: true }, regions
    },
    series: markerSeries
  }, true)
}

watch([cityRecords, cityMarkers, activeLayer], () => { nextTick(updateOption) }, { deep: true })

let ro = null
const handleResize = () => chart?.resize()
onMounted(() => {
  nextTick(initChart)
  window.addEventListener('resize', handleResize)
  ro = new ResizeObserver(() => chart?.resize())
  if (chartRef.value) ro.observe(chartRef.value)
})
onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  ro?.disconnect()
  chart?.dispose()
})
</script>

<template>
  <div class="map-wrapper">
    <div class="layer-toggle">
      <button
        v-for="opt in [
          { key: 'none', label: '纯地图' },
          { key: 'markers', label: '📍 标记' },
          { key: 'routes', label: '✈️ 轨迹' },
          { key: 'both', label: '全部' }
        ]"
        :key="opt.key"
        class="layer-btn"
        :class="{ active: activeLayer === opt.key }"
        @click="activeLayer = opt.key"
      >{{ opt.label }}</button>
    </div>
    <div class="map-container" ref="chartRef"></div>
    <div class="map-legend">
      <div class="leg-item"><span class="dot gray"></span>未探索</div>
      <div class="leg-item"><span class="dot blue-light"></span>1-20%</div>
      <div class="leg-item"><span class="dot blue"></span>21-50%</div>
      <div class="leg-item"><span class="dot gold"></span>51-80%</div>
      <div class="leg-item"><span class="dot red"></span>81-100%</div>
    </div>
    <div class="map-hint">🖱️ 滚轮缩放 · 拖拽移动 · 点击省份进入城市地图</div>
  </div>
</template>

<style scoped>
.map-wrapper { background: rgba(255,255,255,0.03); border-radius: 20px; border: 1px solid rgba(255,255,255,0.08); padding: 20px 24px 16px; position: relative; }
.map-wrapper::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px; background: linear-gradient(90deg, transparent, rgba(96,165,250,0.3), transparent); }
.layer-toggle { display: flex; gap: 6px; margin-bottom: 12px; justify-content: center; }
.layer-btn { padding: 7px 16px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.5); font-size: 13px; cursor: pointer; transition: all 0.2s; }
.layer-btn:hover { background: rgba(255,255,255,0.08); border-color: rgba(96,165,250,0.3); color: rgba(255,255,255,0.8); }
.layer-btn.active { background: rgba(96,165,250,0.15); border-color: rgba(96,165,250,0.5); color: #60a5fa; }
.map-container { width: 100%; height: 68vh; min-height: 480px; }
.map-legend { display: flex; justify-content: center; gap: 18px; margin-top: 10px; flex-wrap: wrap; }
.leg-item { display: flex; align-items: center; gap: 5px; font-size: 11px; color: rgba(255,255,255,0.45); }
.dot { width: 14px; height: 10px; border-radius: 3px; }
.dot.gray { background: rgba(51,65,85,0.6); border: 1px solid rgba(148,163,184,0.2); }
.dot.blue-light { background: linear-gradient(135deg, rgba(56,189,248,0.35), rgba(99,102,241,0.25)); border: 1px solid rgba(56,189,248,0.4); }
.dot.blue { background: linear-gradient(135deg, rgba(56,189,248,0.55), rgba(99,102,241,0.45)); border: 1px solid #38bdf8; }
.dot.gold { background: linear-gradient(135deg, rgba(234,179,8,0.55), rgba(249,115,22,0.45)); border: 1px solid #fbbf24; }
.dot.red { background: linear-gradient(135deg, rgba(239,68,68,0.6), rgba(234,179,8,0.55)); border: 1px solid #ef4444; }
.map-hint { text-align: center; margin-top: 8px; font-size: 12px; color: rgba(255,255,255,0.25); }
@media (max-width: 768px) { .map-wrapper { padding: 12px; } .map-container { height: 52vh; min-height: 300px; } .map-legend { gap: 12px; } }
</style>
