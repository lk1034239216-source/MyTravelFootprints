import https from 'https'
import fs from 'fs'
import path from 'path'

const provinces = {
  '110000': '北京', '120000': '天津', '310000': '上海', '500000': '重庆',
  '130000': '河北', '140000': '山西', '150000': '内蒙古', '210000': '辽宁',
  '220000': '吉林', '230000': '黑龙江', '320000': '江苏', '330000': '浙江',
  '340000': '安徽', '350000': '福建', '360000': '江西', '370000': '山东',
  '410000': '河南', '420000': '湖北', '430000': '湖南', '440000': '广东',
  '450000': '广西', '460000': '海南', '510000': '四川', '520000': '贵州',
  '530000': '云南', '540000': '西藏', '610000': '陕西', '620000': '甘肃',
  '630000': '青海', '640000': '宁夏', '650000': '新疆', '710000': '台湾',
  '810000': '香港', '820000': '澳门'
}

const download = (adcode) => new Promise((resolve, reject) => {
  const url = `https://geo.datav.aliyun.com/areas_v3/bound/${adcode}_full.json`
  const file = path.join('public', 'maps', `${adcode}.json`)

  if (fs.existsSync(file)) {
    console.log(`[skip] ${adcode} ${provinces[adcode]} 已存在`)
    return resolve()
  }

  https.get(url, (res) => {
    if (res.statusCode !== 200) {
      console.log(`[fail] ${adcode} ${provinces[adcode]} HTTP ${res.statusCode}`)
      res.resume()
      return resolve()
    }
    let data = ''
    res.on('data', chunk => data += chunk)
    res.on('end', () => {
      fs.writeFileSync(file, data)
      console.log(`[done] ${adcode} ${provinces[adcode]} ${(data.length / 1024).toFixed(0)}KB`)
      resolve()
    })
  }).on('error', (e) => {
    console.log(`[err] ${adcode} ${provinces[adcode]} ${e.message}`)
    resolve()
  })
})

;(async () => {
  const codes = Object.keys(provinces)
  console.log(`下载 ${codes.length} 个省份地图...`)
  for (const code of codes) {
    await download(code)
  }
  console.log('完成')
})()
