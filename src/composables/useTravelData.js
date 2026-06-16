import { ref, watch } from 'vue'
import { provinceCities } from '../config/cityMap.js'
import { supabase, BUCKET, TABLE } from '../lib/supabase.js'

const cityRecords = ref({})
const companions = ref(loadLocal('travel_companions', []))
const cityMarkers = ref(loadLocal('travel_markers', {}))
const isLoaded = ref(false)

function loadLocal(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) || fallback } catch { return fallback }
}
function saveLocal(key, val) {
  localStorage.setItem(key, JSON.stringify(val))
}

watch(companions, v => saveLocal('travel_companions', v), { deep: true })
watch(cityMarkers, v => saveLocal('travel_markers', v), { deep: true })

export function useTravelData() {
  const loadFromDB = async (userId) => {
    if (!userId) { cityRecords.value = {}; isLoaded.value = true; return }
    try {
      const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .eq('user_id', userId)
        .order('visit_date', { ascending: false })
      if (error) throw error

      const grouped = {}
      for (const row of (data || [])) {
        const city = row.city_name
        if (!grouped[city]) grouped[city] = []
        grouped[city].push({
          id: row.id,
          date: row.visit_date,
          thoughts: row.thoughts || '',
          images: (row.images || []).map((url, i) => ({ id: `${row.id}_${i}`, url, name: '' })),
          companions: row.companions || [],
          fromCity: row.from_city || '',
          transportType: row.transport_type || '',
          createdAt: row.created_at
        })
      }
      cityRecords.value = grouped
      isLoaded.value = true
      console.log('[Supabase] 加载完成，城市数:', Object.keys(grouped).length)
    } catch (e) {
      console.error('[Supabase] 加载失败:', e)
      isLoaded.value = true
    }
  }

  const uploadImages = async (files) => {
    const urls = []
    for (const file of files) {
      if (file.url && file.url.startsWith('http')) { urls.push(file.url); continue }
      const ext = file.name?.split('.').pop() || 'jpg'
      const path = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`
      const blob = file instanceof Blob ? file : await fetch(file.url).then(r => r.blob())
      const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
        contentType: blob.type || 'image/jpeg', upsert: false
      })
      if (error) { console.error('[Storage] 上传失败:', error); continue }
      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)
      urls.push(urlData.publicUrl)
    }
    return urls
  }

  const addRecord = async (userId, cityName, record) => {
    try {
      let imageUrls = []
      if (record.images?.length) imageUrls = await uploadImages(record.images)

      const { data, error } = await supabase
        .from(TABLE)
        .insert({
          user_id: userId,
          city_name: cityName,
          visit_date: record.date,
          thoughts: record.thoughts || '',
          images: imageUrls,
          companions: record.companions || [],
          from_city: record.fromCity || '',
          transport_type: record.transportType || ''
        })
        .select()
        .single()
      if (error) throw error

      const newRecord = {
        id: data.id, date: data.visit_date, thoughts: data.thoughts,
        images: imageUrls.map((url, i) => ({ id: `${data.id}_${i}`, url, name: '' })),
        companions: data.companions || [],
        fromCity: data.from_city || '',
        transportType: data.transport_type || '',
        createdAt: data.created_at
      }
      if (!cityRecords.value[cityName]) cityRecords.value[cityName] = []
      cityRecords.value[cityName].unshift(newRecord)
      return newRecord
    } catch (e) { console.error('[Supabase] 新增失败:', e); throw e }
  }

  const updateRecord = async (cityName, recordId, data) => {
    try {
      let imageUrls = undefined
      if (data.images !== undefined) {
        const existing = data.images.filter(img => img.url?.startsWith('http')).map(img => img.url)
        const toUpload = data.images.filter(img => !img.url?.startsWith('http'))
        const uploaded = toUpload.length ? await uploadImages(toUpload) : []
        imageUrls = [...existing, ...uploaded]
      }

      const updateData = {}
      if (data.date !== undefined) updateData.visit_date = data.date
      if (data.thoughts !== undefined) updateData.thoughts = data.thoughts
      if (imageUrls !== undefined) updateData.images = imageUrls
      if (data.companions !== undefined) updateData.companions = data.companions
      if (data.fromCity !== undefined) updateData.from_city = data.fromCity
      if (data.transportType !== undefined) updateData.transport_type = data.transportType
      updateData.updated_at = new Date().toISOString()

      const { error } = await supabase.from(TABLE).update(updateData).eq('id', recordId)
      if (error) throw error

      const records = cityRecords.value[cityName]
      if (records) {
        const idx = records.findIndex(r => r.id === recordId)
        if (idx !== -1) {
          if (data.date) records[idx].date = data.date
          if (data.thoughts !== undefined) records[idx].thoughts = data.thoughts
          if (imageUrls) records[idx].images = imageUrls.map((url, i) => ({ id: `${recordId}_${i}`, url, name: '' }))
          if (data.companions) records[idx].companions = data.companions
          if (data.fromCity !== undefined) records[idx].fromCity = data.fromCity
          if (data.transportType !== undefined) records[idx].transportType = data.transportType
        }
      }
    } catch (e) { console.error('[Supabase] 更新失败:', e); throw e }
  }

  const deleteRecord = async (cityName, recordId) => {
    try {
      const { error } = await supabase.from(TABLE).delete().eq('id', recordId)
      if (error) throw error
      const records = cityRecords.value[cityName]
      if (records) {
        const idx = records.findIndex(r => r.id === recordId)
        if (idx !== -1) records.splice(idx, 1)
        if (records.length === 0) delete cityRecords.value[cityName]
      }
    } catch (e) { console.error('[Supabase] 删除失败:', e); throw e }
  }

  const getRecords = (cityName) => cityRecords.value[cityName] || []
  const getVisitCount = (cityName) => cityRecords.value[cityName]?.length || 0
  const isVisited = (cityName) => getVisitCount(cityName) > 0
  const getSortedRecords = (cityName) => [...getRecords(cityName)].sort((a, b) => new Date(b.date) - new Date(a.date))

  const getAllRoutes = () => {
    const routes = []
    for (const [toCity, records] of Object.entries(cityRecords.value)) {
      for (const rec of records) {
        if (rec.fromCity) {
          routes.push({
            from: rec.fromCity,
            to: toCity,
            transport: rec.transportType || 'other',
            date: rec.date
          })
        }
      }
    }
    return routes
  }

  const getAllStats = () => {
    const cities = Object.keys(cityRecords.value).filter(k => cityRecords.value[k].length > 0)
    const totalRecords = cities.reduce((s, c) => s + cityRecords.value[c].length, 0)
    return { visitedCities: cities.length, totalRecords }
  }

  const getCompanions = () => companions.value
  const addCompanion = (name) => {
    const trimmed = name.trim()
    if (!trimmed || companions.value.includes(trimmed)) return false
    companions.value.push(trimmed); return true
  }
  const removeCompanion = (name) => {
    const idx = companions.value.indexOf(name)
    if (idx !== -1) companions.value.splice(idx, 1)
  }

  const getMarkers = (cityName) => cityMarkers.value[cityName] || []
  const hasMarker = (cityName, type) => (cityMarkers.value[cityName] || []).includes(type)
  const toggleMarker = (cityName, type) => {
    if (!cityMarkers.value[cityName]) cityMarkers.value[cityName] = []
    const idx = cityMarkers.value[cityName].indexOf(type)
    if (idx === -1) cityMarkers.value[cityName].push(type)
    else cityMarkers.value[cityName].splice(idx, 1)
    if (cityMarkers.value[cityName].length === 0) delete cityMarkers.value[cityName]
  }
  const getMarkerIcons = (cityName) => {
    return (cityMarkers.value[cityName] || []).map(type => MARKER_TYPES.find(m => m.key === type)).filter(Boolean)
  }

  const getProvinceProgress = (provinceName) => {
    const cities = provinceCities[provinceName] || []
    if (cities.length === 0) return { visited: 0, total: 0, percent: 0 }
    const visited = cities.filter(c => getVisitCount(c) > 0).length
    return { visited, total: cities.length, percent: Math.round((visited / cities.length) * 100) }
  }

  const clearLocal = () => {
    cityRecords.value = {}
    isLoaded.value = false
  }

  return {
    cityRecords, companions, cityMarkers, isLoaded,
    loadFromDB, clearLocal,
    getRecords, getVisitCount, isVisited,
    addRecord, updateRecord, deleteRecord,
    getSortedRecords, getAllStats, getAllRoutes,
    getCompanions, addCompanion, removeCompanion,
    getMarkers, hasMarker, toggleMarker, getMarkerIcons,
    getProvinceProgress
  }
}

export const MARKER_TYPES = [
  { key: 'home', icon: '🏠', label: '家庭所在地' },
  { key: 'school', icon: '🎓', label: '学校所在地' },
  { key: 'work', icon: '💼', label: '工作所在地' },
  { key: 'hometown', icon: '🏡', label: '故乡' },
  { key: 'wish', icon: '🌟', label: '心愿目的地' },
]
