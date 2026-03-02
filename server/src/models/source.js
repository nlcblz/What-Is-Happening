// server/src/models/source.js
const dbModule = require('./db')
const seedSources = require('../data/seed-sources.json')

// 数据源 ID 计数器（仅内存模式使用）
let nextId = 1

// 初始化种子数据
async function init() {
  if (dbModule.isCloud()) {
    // 云数据库模式：检查是否需要播种
    const cloudDb = dbModule.getDb()
    const { total } = await cloudDb.collection('sources').count()
    if (total === 0) {
      // 播种数据
      for (const s of seedSources) {
        await cloudDb.collection('sources').add({
          ...s,
          lastScrapedAt: null,
          createdAt: new Date().toISOString()
        })
      }
      console.log(`[WIH] 已播种 ${seedSources.length} 个数据源到云数据库`)
    } else {
      console.log(`[WIH] 云数据库已有 ${total} 个数据源`)
    }
  } else {
    // 内存模式：加载种子数据
    const memDb = dbModule.getDb()
    if (memDb.sources.length === 0) {
      memDb.sources = seedSources.map(s => ({
        ...s,
        lastScrapedAt: null,
        createdAt: new Date().toISOString()
      }))
      console.log(`[WIH] 已加载 ${memDb.sources.length} 个数据源`)
    }
    // 初始化 nextId，从种子数据后开始
    nextId = memDb.sources.length + 1
  }
}

// 获取所有数据源
async function getAll() {
  if (dbModule.isCloud()) {
    const cloudDb = dbModule.getDb()
    const { data } = await cloudDb.collection('sources').get()
    return dbModule.normalizeDocs(data)
  } else {
    const memDb = dbModule.getDb()
    return memDb.sources
  }
}

// 获取启用的数据源
async function getEnabled() {
  if (dbModule.isCloud()) {
    const cloudDb = dbModule.getDb()
    const { data } = await cloudDb.collection('sources').where({ enabled: true }).get()
    return dbModule.normalizeDocs(data)
  } else {
    const memDb = dbModule.getDb()
    return memDb.sources.filter(s => s.enabled)
  }
}

// 根据 ID 获取数据源
async function getById(id) {
  if (dbModule.isCloud()) {
    const cloudDb = dbModule.getDb()
    const { data } = await cloudDb.collection('sources').doc(String(id)).get()
    return data.length > 0 ? dbModule.normalizeDoc(data[0]) : null
  } else {
    const memDb = dbModule.getDb()
    const strId = String(id)
    return memDb.sources.find(s => s.id === strId)
  }
}

// 更新数据源的最后抓取时间
async function updateLastScraped(id) {
  if (dbModule.isCloud()) {
    const cloudDb = dbModule.getDb()
    await cloudDb.collection('sources').doc(String(id)).update({
      lastScrapedAt: new Date().toISOString()
    })
    return await getById(id)
  } else {
    const source = await getById(id)
    if (source) {
      source.lastScrapedAt = new Date().toISOString()
    }
    return source
  }
}

// 新增数据源
async function add(sourceData) {
  const newSource = {
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

  if (dbModule.isCloud()) {
    const cloudDb = dbModule.getDb()
    const result = await cloudDb.collection('sources').add(newSource)
    return { id: result.id, ...newSource }
  } else {
    newSource.id = String(nextId)
    nextId++
    const memDb = dbModule.getDb()
    memDb.sources.push(newSource)
    return newSource
  }
}

// 更新数据源（部分更新）
async function update(id, updateData) {
  const source = await getById(id)
  if (!source) {
    return null
  }

  if (dbModule.isCloud()) {
    const cloudDb = dbModule.getDb()
    const updateFields = {}
    // 仅更新允许的字段
    if (updateData.name !== undefined) updateFields.name = updateData.name
    if (updateData.url !== undefined) updateFields.url = updateData.url
    if (updateData.type !== undefined) updateFields.type = updateData.type
    if (updateData.category !== undefined) updateFields.category = updateData.category
    if (updateData.enabled !== undefined) updateFields.enabled = updateData.enabled
    if (updateData.config !== undefined) updateFields.config = updateData.config
    if (updateData.scrapeInterval !== undefined) updateFields.scrapeInterval = updateData.scrapeInterval
    updateFields.updatedAt = new Date().toISOString()

    await cloudDb.collection('sources').doc(String(id)).update(updateFields)
    return await getById(id)
  } else {
    // 内存模式：直接修改
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
}

// 删除数据源
async function remove(id) {
  if (dbModule.isCloud()) {
    const cloudDb = dbModule.getDb()
    const source = await getById(id)
    if (!source) return null
    await cloudDb.collection('sources').doc(String(id)).remove()
    return source
  } else {
    const memDb = dbModule.getDb()
    const index = memDb.sources.findIndex(s => s.id === id)
    if (index === -1) {
      return null
    }
    const removed = memDb.sources.splice(index, 1)
    return removed[0]
  }
}

module.exports = { init, getAll, getEnabled, getById, updateLastScraped, add, update, remove }
