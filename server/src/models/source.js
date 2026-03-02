// server/src/models/source.js
const db = require('./db')
const seedSources = require('../data/seed-sources.json')

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

module.exports = { init, getAll, getEnabled, getById, updateLastScraped }
