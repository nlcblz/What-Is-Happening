// server/src/models/source.js
const db = require('./db')
const seedSources = require('../data/seed-sources.json')

// 数据源 ID 计数器，从种子数据数量之后开始
let nextId = 1

// 初始化种子数据
function init() {
  if (db.sources.length === 0) {
    db.sources = seedSources.map(s => ({
      ...s,
      lastScrapedAt: null,
      createdAt: new Date().toISOString()
    }))
    console.log(`[WIH] 已加载 ${db.sources.length} 个数据源`)
  }
  // 初始化 nextId，从种子数据后开始
  nextId = db.sources.length + 1
}

// 获取所有数据源
function getAll() {
  return db.sources
}

// 获取启用的数据源
function getEnabled() {
  return db.sources.filter(s => s.enabled)
}

// 根据 ID 获取数据源
function getById(id) {
  return db.sources.find(s => s.id === id)
}

// 更新数据源的最后抓取时间
function updateLastScraped(id) {
  const source = getById(id)
  if (source) {
    source.lastScrapedAt = new Date().toISOString()
  }
  return source
}

// 新增数据源
function add(sourceData) {
  const newSource = {
    id: String(nextId),
    name: sourceData.name,
    url: sourceData.url,
    type: sourceData.type,
    category: sourceData.category,
    enabled: sourceData.enabled !== false, // 默认启用
    config: sourceData.config || {},
    scrapeInterval: sourceData.scrapeInterval || 1800,
    lastScrapedAt: null,
    createdAt: new Date().toISOString()
  }
  nextId++
  db.sources.push(newSource)
  return newSource
}

// 更新数据源（部分更新）
function update(id, updateData) {
  const source = getById(id)
  if (!source) {
    return null
  }
  // 仅更新允许的字段
  if (updateData.name !== undefined) source.name = updateData.name
  if (updateData.url !== undefined) source.url = updateData.url
  if (updateData.type !== undefined) source.type = updateData.type
  if (updateData.category !== undefined) source.category = updateData.category
  if (updateData.enabled !== undefined) source.enabled = updateData.enabled
  if (updateData.config !== undefined) source.config = updateData.config
  if (updateData.scrapeInterval !== undefined) source.scrapeInterval = updateData.scrapeInterval
  source.updatedAt = new Date().toISOString()
  return source
}

// 删除数据源
function remove(id) {
  const index = db.sources.findIndex(s => s.id === id)
  if (index === -1) {
    return null
  }
  const removed = db.sources.splice(index, 1)
  return removed[0]
}

module.exports = { init, getAll, getEnabled, getById, updateLastScraped, add, update, remove }
