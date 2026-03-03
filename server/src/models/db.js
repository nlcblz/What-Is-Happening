// server/src/models/db.js
// 双模式数据存储：云数据库 (TCB_ENV) 或 内存 (开发用)
const config = require('../config')

let _db = null
let _cloudApp = null
let _isCloud = false

// 初始化数据库连接
async function init() {
  if (config.tcbEnv) {
    const cloudbase = require('@cloudbase/node-sdk')
    _cloudApp = cloudbase.init({ env: config.tcbEnv })
    _db = _cloudApp.database()
    _isCloud = true
    console.log(`[WIH] 云数据库已连接 (环境: ${config.tcbEnv})`)

    // 验证必需集合是否存在（CloudBase 不支持代码创建集合）
    const requiredCollections = ['sources', 'trends']
    for (const col of requiredCollections) {
      try {
        await _db.collection(col).limit(1).get()
        console.log(`[WIH] 集合 ${col} 已就绪`)
      } catch (err) {
        console.warn(`[WIH] 集合 ${col} 不存在或无权限: ${err.message}`)
        console.warn(`[WIH] 请在云托管控制台 → 数据库 → 手动创建集合: ${col}`)
      }
    }
  } else {
    // 内存模式（本地开发）
    _db = { sources: [], trends: [] }
    _isCloud = false
    console.log('[WIH] 使用内存存储（本地开发模式）')
  }
}

// 获取数据库实例
function getDb() {
  if (!_db) {
    throw new Error('数据库未初始化，请先调用 init()')
  }
  return _db
}

// 获取 CloudBase command 操作符
function getCommand() {
  if (!_isCloud || !_db) return null
  return _db.command
}

function isCloud() {
  return _isCloud
}

// ID 规范化辅助函数
function normalizeDoc(doc) {
  if (!doc) return null
  const { _id, ...rest } = doc
  return { id: _id, ...rest }
}

function normalizeDocs(docs) {
  return docs.map(normalizeDoc)
}

module.exports = { init, getDb, getCommand, isCloud, normalizeDoc, normalizeDocs }
