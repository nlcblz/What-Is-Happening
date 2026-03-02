// server/src/models/trend.js
const db = require('./db')

let nextId = 1

// 添加趋势条目
function add(trend) {
  const entry = {
    id: nextId++,
    title: trend.title,
    url: trend.url || '',
    summary: trend.summary || '',
    summaryZh: trend.summaryZh || '',
    sourceId: trend.sourceId,
    sourceName: trend.sourceName || '',
    category: trend.category || 'general',
    imageUrl: trend.imageUrl || '',
    publishedAt: trend.publishedAt || new Date().toISOString(),
    scrapedAt: new Date().toISOString(),
    summarized: !!trend.summary
  }
  db.trends.unshift(entry) // 最新的在前面
  return entry
}

// 批量添加（去重）
function addBatch(trends) {
  const added = []
  for (const t of trends) {
    // 按 URL 去重
    const exists = db.trends.find(existing => existing.url === t.url)
    if (!exists && t.url) {
      added.push(add(t))
    }
  }
  return added
}

// 获取趋势列表（分页、多分类筛选、搜索）
function getList({ page = 1, pageSize = 20, category, search } = {}) {
  let filtered = db.trends
  
  // 分类筛选：支持逗号分隔的多分类（OR 逻辑）
  if (category && category !== 'all') {
    if (category.includes(',')) {
      // 多分类模式：至少匹配其中一个
      const categories = category.split(',').map(c => c.trim())
      filtered = filtered.filter(t => categories.includes(t.category))
    } else {
      // 单分类模式：精确匹配（向后兼容）
      filtered = filtered.filter(t => t.category === category)
    }
  }
  
  if (search) {
    const keyword = search.toLowerCase()
    filtered = filtered.filter(t => 
      t.title.toLowerCase().includes(keyword) || 
      (t.summaryZh && t.summaryZh.toLowerCase().includes(keyword))
    )
  }
  
  const total = filtered.length
  const start = (page - 1) * pageSize
  const data = filtered.slice(start, start + pageSize)
  return {
    data,
    total,
    page,
    pageSize,
    hasMore: start + pageSize < total
  }
}

// 根据 ID 获取趋势
function getById(id) {
  return db.trends.find(t => t.id === id)
}

// 更新摘要
function updateSummary(id, summary, summaryZh) {
  const trend = getById(id)
  if (trend) {
    trend.summary = summary
    trend.summaryZh = summaryZh || ''
    trend.summarized = true
  }
  return trend
}

// 获取未摘要的趋势
function getUnsummarized(limit = 10) {
  return db.trends.filter(t => !t.summarized).slice(0, limit)
}

// 清空所有趋势
function clear() {
  db.trends = []
  nextId = 1
}

module.exports = { add, addBatch, getList, getById, updateSummary, getUnsummarized, clear }
