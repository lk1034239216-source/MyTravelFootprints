export const provinceConfig = {
  '北京': { adcode: '110000', fullName: '北京市' },
  '天津': { adcode: '120000', fullName: '天津市' },
  '河北': { adcode: '130000', fullName: '河北省' },
  '山西': { adcode: '140000', fullName: '山西省' },
  '内蒙古': { adcode: '150000', fullName: '内蒙古自治区' },
  '辽宁': { adcode: '210000', fullName: '辽宁省' },
  '吉林': { adcode: '220000', fullName: '吉林省' },
  '黑龙江': { adcode: '230000', fullName: '黑龙江省' },
  '上海': { adcode: '310000', fullName: '上海市' },
  '江苏': { adcode: '320000', fullName: '江苏省' },
  '浙江': { adcode: '330000', fullName: '浙江省' },
  '安徽': { adcode: '340000', fullName: '安徽省' },
  '福建': { adcode: '350000', fullName: '福建省' },
  '江西': { adcode: '360000', fullName: '江西省' },
  '山东': { adcode: '370000', fullName: '山东省' },
  '河南': { adcode: '410000', fullName: '河南省' },
  '湖北': { adcode: '420000', fullName: '湖北省' },
  '湖南': { adcode: '430000', fullName: '湖南省' },
  '广东': { adcode: '440000', fullName: '广东省' },
  '广西': { adcode: '450000', fullName: '广西壮族自治区' },
  '海南': { adcode: '460000', fullName: '海南省' },
  '重庆': { adcode: '500000', fullName: '重庆市' },
  '四川': { adcode: '510000', fullName: '四川省' },
  '贵州': { adcode: '520000', fullName: '贵州省' },
  '云南': { adcode: '530000', fullName: '云南省' },
  '西藏': { adcode: '540000', fullName: '西藏自治区' },
  '陕西': { adcode: '610000', fullName: '陕西省' },
  '甘肃': { adcode: '620000', fullName: '甘肃省' },
  '青海': { adcode: '630000', fullName: '青海省' },
  '宁夏': { adcode: '640000', fullName: '宁夏回族自治区' },
  '新疆': { adcode: '650000', fullName: '新疆维吾尔自治区' },
  '台湾': { adcode: '710000', fullName: '台湾省' }
}

export const getProvinceByAdcode = (adcode) => {
  return Object.entries(provinceConfig).find(([_, config]) => config.adcode === adcode)
}

export const getProvinceByName = (name) => {
  return provinceConfig[name] || null
}
