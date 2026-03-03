// server/src/models/source.js
// 数据源模型 — MySQL 版
const db = require('./db')
const seedSources = require('../data/seed-sources.json')

// 初始化种子数据
async function init() {
  const rows = await db.query('SELECT COUNT(*) AS cnt FROM sources')
  const count = rows[0].cnt

  if (count === 0) {
    // 播种数据
    const sql = `INSERT INTO sources (id, name, name_zh, type, url, category, language, enabled, config, scrape_interval)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    for (const s of seedSources) {
      await db.query(sql, [
        s.id,
        s.name,
        s.nameZh || '',
        s.type,
        s.url,
        s.category,
        s.language || 'en',
        s.enabled ? 1 : 0,
        JSON.stringify(s.config || {}),
        s.scrapeInterval || 1800
      ])
    }
    console.log(`[WIH] 已播种 ${seedSources.length} 个数据源到 MySQL`)
  } else {
    console.log(`[WIH] MySQL 已有 ${count} 个数据源`)
  }
}

// 行数据 → 应用对象
function rowToSource(row) {
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    nameZh: row.name_zh,
    type: row.type,
    url: row.url,
    category: row.category,
    language: row.language,
    enabled: !!row.enabled,
    config: typeof row.config === 'string' ? JSON.parse(row.config) : (row.config || {}),
    scrapeInterval: row.scrape_interval,
    lastScrapedAt: row.last_scraped_at ? row.last_scraped_at.toISOString() : null,
    createdAt: row.created_at ? row.created_at.toISOString() : null,
    updatedAt: row.updated_at ? row.updated_at.toISOString() : null
  }
}

// 获取所有数据源
async function getAll() {
  const rows = await db.query('SELECT * FROM sources ORDER BY created_at ASC')
  return rows.map(rowToSource)
}

// 获取启用的数据源
async function getEnabled() {
  const rows = await db.query('SELECT * FROM sources WHERE enabled = 1 ORDER BY created_at ASC')
  return rows.map(rowToSource)
}

// 根据 ID 获取数据源
async function getById(id) {
  const rows = await db.query('SELECT * FROM sources WHERE id = ?', [String(id)])
  return rows.length > 0 ? rowToSource(rows[0]) : null
}

// 更新数据源的最后抓取时间
async function updateLastScraped(id) {
  await db.query('UPDATE sources SET last_scraped_at = NOW() WHERE id = ?', [String(id)])
  return await getById(id)
}

// 新增数据源
async function add(sourceData) {
  const id = sourceData.id || `src-${Date.now()}`
  const sql = `INSERT INTO sources (id, name, name_zh, type, url, category, language, enabled, config, scrape_interval)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  await db.query(sql, [
    id,
    sourceData.name,
    sourceData.nameZh || '',
    sourceData.type || 'rss',
    sourceData.url,
    sourceData.category || 'general',
    sourceData.language || 'en',
    sourceData.enabled !== false ? 1 : 0,
    JSON.stringify(sourceData.config || {}),
    sourceData.scrapeInterval || 1800
  ])
  return await getById(id)
}

// 更新数据源（部分更新）
async function update(id, updateData) {
  const source = await getById(id)
  if (!source) return null

  const fields = []
  const params = []

  if (updateData.name !== undefined) { fields.push('name = ?'); params.push(updateData.name) }
  if (updateData.nameZh !== undefined) { fields.push('name_zh = ?'); params.push(updateData.nameZh) }
  if (updateData.url !== undefined) { fields.push('url = ?'); params.push(updateData.url) }
  if (updateData.type !== undefined) { fields.push('type = ?'); params.push(updateData.type) }
  if (updateData.category !== undefined) { fields.push('category = ?'); params.push(updateData.category) }
  if (updateData.enabled !== undefined) { fields.push('enabled = ?'); params.push(updateData.enabled ? 1 : 0) }
  if (updateData.config !== undefined) { fields.push('config = ?'); params.push(JSON.stringify(updateData.config)) }
  if (updateData.scrapeInterval !== undefined) { fields.push('scrape_interval = ?'); params.push(updateData.scrapeInterval) }

  if (fields.length === 0) return source

  params.push(String(id))
  await db.query(`UPDATE sources SET ${fields.join(', ')} WHERE id = ?`, params)
  return await getById(id)
}

// 删除数据源
async function remove(id) {
  const source = await getById(id)
  if (!source) return null
  await db.query('DELETE FROM sources WHERE id = ?', [String(id)])
  return source
}

module.exports = { init, getAll, getEnabled, getById, updateLastScraped, add, update, remove }
