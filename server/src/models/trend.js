// server/src/models/trend.js
// 趋势模型 — MySQL 版
const db = require('./db')

// 行数据 → 应用对象
function rowToTrend(row) {
  if (!row) return null
  return {
    id: String(row.id),
    title: row.title,
    url: row.url,
    summary: row.summary,
    summaryZh: row.summary_zh,
    sourceId: row.source_id,
    sourceName: row.source_name,
    category: row.category,
    imageUrl: row.image_url,
    publishedAt: row.published_at ? row.published_at.toISOString() : null,
    scrapedAt: row.scraped_at ? row.scraped_at.toISOString() : null,
    summarized: !!row.summarized
  }
}

// 添加趋势条目
async function add(trend) {
  const sql = `INSERT INTO trends (title, url, summary, summary_zh, source_id, source_name, category, image_url, published_at, scraped_at, summarized)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)`
  const params = [
    trend.title,
    trend.url || '',
    trend.summary || '',
    trend.summaryZh || '',
    trend.sourceId || '',
    trend.sourceName || '',
    trend.category || 'general',
    trend.imageUrl || '',
    trend.publishedAt || new Date().toISOString(),
    trend.summary ? 1 : 0
  ]
  const result = await db.query(sql, params)
  return {
    id: String(result.insertId),
    title: trend.title,
    url: trend.url || '',
    summary: trend.summary || '',
    summaryZh: trend.summaryZh || '',
    sourceId: trend.sourceId || '',
    sourceName: trend.sourceName || '',
    category: trend.category || 'general',
    imageUrl: trend.imageUrl || '',
    publishedAt: trend.publishedAt || new Date().toISOString(),
    scrapedAt: new Date().toISOString(),
    summarized: !!trend.summary
  }
}

// 批量添加（按 URL 去重）
async function addBatch(trends) {
  const added = []
  for (const t of trends) {
    if (!t.url) continue

    // 按 URL 去重
    const existing = await db.query('SELECT id FROM trends WHERE url = ? LIMIT 1', [t.url])
    if (existing.length === 0) {
      const entry = await add(t)
      added.push(entry)
    }
  }
  return added
}

// 获取趋势列表（分页、多分类筛选、搜索）
async function getList({ page = 1, pageSize = 20, category, search } = {}) {
  const conditions = []
  const params = []

  // 分类筛选：支持逗号分隔的多分类（OR 逻辑）
  if (category && category !== 'all') {
    if (category.includes(',')) {
      const categories = category.split(',').map(c => c.trim())
      const placeholders = categories.map(() => '?').join(', ')
      conditions.push(`category IN (${placeholders})`)
      params.push(...categories)
    } else {
      conditions.push('category = ?')
      params.push(category)
    }
  }

  // 搜索筛选（标题 + 中文摘要模糊匹配）
  if (search) {
    conditions.push('(title LIKE ? OR summary_zh LIKE ?)')
    const keyword = `%${search}%`
    params.push(keyword, keyword)
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  // 获取总数
  const countRows = await db.query(`SELECT COUNT(*) AS total FROM trends ${whereClause}`, params)
  const total = countRows[0].total

  // 分页查询
  const offset = (page - 1) * pageSize
  const dataRows = await db.query(
    `SELECT * FROM trends ${whereClause} ORDER BY scraped_at DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  )

  return {
    data: dataRows.map(rowToTrend),
    total,
    page,
    pageSize,
    hasMore: offset + dataRows.length < total
  }
}

// 根据 ID 获取趋势
async function getById(id) {
  const rows = await db.query('SELECT * FROM trends WHERE id = ?', [parseInt(id, 10)])
  return rows.length > 0 ? rowToTrend(rows[0]) : null
}

// 更新摘要
async function updateSummary(id, summary, summaryZh) {
  await db.query(
    'UPDATE trends SET summary = ?, summary_zh = ?, summarized = 1 WHERE id = ?',
    [summary, summaryZh || '', parseInt(id, 10)]
  )
  return await getById(id)
}

// 获取未摘要的趋势
async function getUnsummarized(limit = 10) {
  const rows = await db.query(
    'SELECT * FROM trends WHERE summarized = 0 ORDER BY scraped_at DESC LIMIT ?',
    [limit]
  )
  return rows.map(rowToTrend)
}

// 清空所有趋势（仅开发环境使用）
async function clear() {
  await db.query('TRUNCATE TABLE trends')
}

module.exports = { add, addBatch, getList, getById, updateSummary, getUnsummarized, clear }
