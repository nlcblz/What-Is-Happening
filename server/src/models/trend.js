// server/src/models/trend.js
const dbModule = require('./db')

let nextId = 1

// 添加趋势条目
async function add(trend) {
  const entry = {
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

  if (dbModule.isCloud()) {
    const cloudDb = dbModule.getDb()
    const result = await cloudDb.collection('trends').add(entry)
    return { id: result.id, ...entry }
  } else {
    entry.id = String(nextId++)
    const memDb = dbModule.getDb()
    memDb.trends.unshift(entry) // 最新的在前面
    return entry
  }
}

// 批量添加（去重）
async function addBatch(trends) {
  const added = []
  for (const t of trends) {
    if (!t.url) continue
    
    // 按 URL 去重
    if (dbModule.isCloud()) {
      const cloudDb = dbModule.getDb()
      const { total } = await cloudDb.collection('trends').where({ url: t.url }).count()
      if (total === 0) {
        const entry = await add(t)
        added.push(entry)
      }
    } else {
      const memDb = dbModule.getDb()
      const exists = memDb.trends.find(existing => existing.url === t.url)
      if (!exists) {
        const entry = await add(t)
        added.push(entry)
      }
    }
  }
  return added
}

// 获取趋势列表（分页、多分类筛选、搜索）
async function getList({ page = 1, pageSize = 20, category, search } = {}) {
  if (dbModule.isCloud()) {
    const cloudDb = dbModule.getDb()
    const _ = dbModule.getCommand()
    
    // 构建查询条件
    const conditions = []
    
    // 分类筛选：支持逗号分隔的多分类（OR 逻辑）
    if (category && category !== 'all') {
      if (category.includes(',')) {
        // 多分类模式：至少匹配其中一个
        const categories = category.split(',').map(c => c.trim())
        conditions.push({ category: _.in(categories) })
      } else {
        // 单分类模式：精确匹配
        conditions.push({ category })
      }
    }
    
    // 搜索筛选
    if (search) {
      const regexp = cloudDb.RegExp({ regexp: search, options: 'i' })
      conditions.push(
        _.or([
          { title: regexp },
          { summaryZh: regexp }
        ])
      )
    }
    
    // 组合查询条件
    const query = conditions.length > 0 
      ? (conditions.length === 1 
          ? cloudDb.collection('trends').where(conditions[0])
          : cloudDb.collection('trends').where(_.and(conditions)))
      : cloudDb.collection('trends')
    
    // 获取总数
    const { total } = await query.count()
    
    // 分页查询
    const { data } = await query
      .orderBy('scrapedAt', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()
    
    return {
      data: dbModule.normalizeDocs(data),
      total,
      page,
      pageSize,
      hasMore: (page - 1) * pageSize + data.length < total
    }
  } else {
    // 内存模式
    const memDb = dbModule.getDb()
    let filtered = memDb.trends
    
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
}

// 根据 ID 获取趋势
async function getById(id) {
  if (dbModule.isCloud()) {
    const cloudDb = dbModule.getDb()
    const { data } = await cloudDb.collection('trends').doc(String(id)).get()
    return data.length > 0 ? dbModule.normalizeDoc(data[0]) : null
  } else {
    const memDb = dbModule.getDb()
    const strId = String(id)
    return memDb.trends.find(t => t.id === strId)
  }
}

// 更新摘要
async function updateSummary(id, summary, summaryZh) {
  if (dbModule.isCloud()) {
    const cloudDb = dbModule.getDb()
    await cloudDb.collection('trends').doc(String(id)).update({
      summary,
      summaryZh: summaryZh || '',
      summarized: true
    })
    return await getById(id)
  } else {
    const trend = await getById(id)
    if (trend) {
      trend.summary = summary
      trend.summaryZh = summaryZh || ''
      trend.summarized = true
    }
    return trend
  }
}

// 获取未摘要的趋势
async function getUnsummarized(limit = 10) {
  if (dbModule.isCloud()) {
    const cloudDb = dbModule.getDb()
    const { data } = await cloudDb.collection('trends')
      .where({ summarized: false })
      .limit(limit)
      .get()
    return dbModule.normalizeDocs(data)
  } else {
    const memDb = dbModule.getDb()
    return memDb.trends.filter(t => !t.summarized).slice(0, limit)
  }
}

// 清空所有趋势
async function clear() {
  if (dbModule.isCloud()) {
    // 云数据库模式：跳过或抛出不支持错误
    throw new Error('云数据库模式不支持 clear() 操作')
  } else {
    const memDb = dbModule.getDb()
    memDb.trends = []
    nextId = 1
  }
}

module.exports = { add, addBatch, getList, getById, updateSummary, getUnsummarized, clear }
