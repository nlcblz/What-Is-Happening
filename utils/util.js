// utils/util.js
// 全局共享工具函数

const formatTime = date => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()
  const second = date.getSeconds()

  return `${[year, month, day].map(formatNumber).join('/')} ${[hour, minute, second].map(formatNumber).join(':')}`
}

const formatNumber = n => {
  n = n.toString()
  return n[1] ? n : `0${n}`
}

// 分类 id → 中文名映射
const categoryLabelMap = {
  tech: '科技',
  international: '国际',
  finance: '财经',
  entertainment: '娱乐',
  society: '社会'
}

// 时间格式化：ISO 日期 → 相对时间
function formatTimeAgo(dateStr) {
  const now = Date.now()
  const date = new Date(dateStr).getTime()
  const diff = now - date
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 30) return `${days}天前`
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

// 给趋势列表补上 timeAgo 和 categoryLabel 字段
function enrichTrends(trends) {
  return trends.map(item => ({
    ...item,
    timeAgo: formatTimeAgo(item.publishedAt),
    categoryLabel: categoryLabelMap[item.category] || item.category
  }))
}

module.exports = {
  formatTime,
  formatNumber,
  categoryLabelMap,
  formatTimeAgo,
  enrichTrends
}
