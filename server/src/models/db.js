// server/src/models/db.js
// MySQL 数据存储 — mysql2 连接池 + TDSQL-C Serverless 冷启动重连
const mysql = require('mysql2/promise')
const config = require('../config')

let _pool = null

// SQL 建表语句
const SCHEMA_SQL = [
  `CREATE TABLE IF NOT EXISTS sources (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    name_zh VARCHAR(128) NOT NULL DEFAULT '',
    type VARCHAR(16) NOT NULL DEFAULT 'rss',
    url TEXT NOT NULL,
    category VARCHAR(32) NOT NULL DEFAULT 'general',
    language VARCHAR(8) NOT NULL DEFAULT 'en',
    enabled TINYINT(1) NOT NULL DEFAULT 1,
    config JSON,
    scrape_interval INT NOT NULL DEFAULT 1800,
    last_scraped_at DATETIME DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS trends (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(512) NOT NULL,
    url TEXT NOT NULL DEFAULT '',
    summary TEXT NOT NULL DEFAULT '',
    summary_zh TEXT NOT NULL DEFAULT '',
    content MEDIUMTEXT NOT NULL DEFAULT '',
    content_zh MEDIUMTEXT NOT NULL DEFAULT '',
    language VARCHAR(8) NOT NULL DEFAULT 'en',
    source_id VARCHAR(64) NOT NULL DEFAULT '',
    source_name VARCHAR(128) NOT NULL DEFAULT '',
    category VARCHAR(32) NOT NULL DEFAULT 'general',
    image_url TEXT NOT NULL DEFAULT '',
    published_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    scraped_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    summarized TINYINT(1) NOT NULL DEFAULT 0,
    translated TINYINT(1) NOT NULL DEFAULT 0,
    INDEX idx_category (category),
    INDEX idx_scraped_at (scraped_at),
    INDEX idx_url (url(255)),
    INDEX idx_summarized (summarized)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS admin_posts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(512) NOT NULL,
    content_md MEDIUMTEXT NOT NULL DEFAULT '',
    content_html MEDIUMTEXT NOT NULL DEFAULT '',
    summary VARCHAR(512) NOT NULL DEFAULT '',
    category VARCHAR(32) NOT NULL DEFAULT 'announcement',
    cover_url TEXT NOT NULL DEFAULT '',
    author VARCHAR(64) NOT NULL DEFAULT '管理员',
    status ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'draft',
    published_at DATETIME DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_published_at (published_at),
    INDEX idx_category (category)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
]

// 初始化连接池 + 建表
async function init() {
  const { host, port, user, password, database } = config.mysql

  if (!password) {
    console.warn('[WIH] MYSQL_PASSWORD 未设置，使用内存模式')
    throw new Error('MYSQL_PASSWORD 未配置')
  }

  // 先连接到 MySQL 服务器（不指定数据库），确保数据库存在
  const tempPool = mysql.createPool({
    host,
    port,
    user,
    password,
    waitForConnections: true,
    connectionLimit: 2,
    connectTimeout: 15000
  })

  try {
    await executeWithRetry(tempPool, `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
    console.log(`[WIH] 数据库 ${database} 已就绪`)
  } finally {
    await tempPool.end()
  }

  // 创建正式连接池（指定数据库）
  _pool = mysql.createPool({
    host,
    port,
    user,
    password,
    database,
    waitForConnections: true,
    connectionLimit: 10,
    connectTimeout: 15000,
    // TDSQL-C Serverless 冷启动可能较慢
    acquireTimeout: 30000,
    // 空闲连接 5 分钟后释放（TDSQL-C 10 分钟无连接自动暂停）
    idleTimeout: 300000,
    // 开启 keep-alive 防止连接被中间件断开
    enableKeepAlive: true,
    keepAliveInitialDelay: 30000
  })

  // 验证连接
  const conn = await _pool.getConnection()
  console.log('[WIH] MySQL 连接池已建立')
  conn.release()

  // 建表
  for (const sql of SCHEMA_SQL) {
    await executeWithRetry(_pool, sql)
  }
  console.log('[WIH] 数据表已就绪 (sources, trends, admin_posts)')

  // 迁移：为已有表添加新字段（如果不存在）
  const migrations = [
    "ALTER TABLE trends ADD COLUMN IF NOT EXISTS content MEDIUMTEXT NOT NULL DEFAULT '' AFTER summary_zh",
    "ALTER TABLE trends ADD COLUMN IF NOT EXISTS content_zh MEDIUMTEXT NOT NULL DEFAULT '' AFTER content",
    "ALTER TABLE trends ADD COLUMN IF NOT EXISTS language VARCHAR(8) NOT NULL DEFAULT 'en' AFTER content_zh",
    "ALTER TABLE trends ADD COLUMN IF NOT EXISTS translated TINYINT(1) NOT NULL DEFAULT 0 AFTER summarized"
  ]
  for (const sql of migrations) {
    try {
      await executeWithRetry(_pool, sql)
    } catch (err) {
      // 忽略 "Duplicate column" 错误（MySQL 5.7 不支持 IF NOT EXISTS）
      if (!err.message.includes('Duplicate column')) {
        console.warn('[WIH] 迁移警告:', err.message)
      }
    }
  }
}

// TDSQL-C Serverless 冷启动重试：遇到 "CynosDB serverless instance is resuming" 时自动重试
async function executeWithRetry(pool, sql, params = [], maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const [rows] = await pool.execute(sql, params)
      return rows
    } catch (err) {
      const msg = err.message || ''
      // TDSQL-C Serverless 冷启动恢复中
      const isResuming = msg.includes('resuming') || msg.includes('CynosDB')
      // 连接被重置 / 超时
      const isTransient = err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT' || err.code === 'PROTOCOL_CONNECTION_LOST'

      if ((isResuming || isTransient) && attempt < maxRetries) {
        const delay = attempt * 3000 // 3s, 6s, 9s
        console.warn(`[WIH] MySQL 重试 ${attempt}/${maxRetries} (${msg})，等待 ${delay}ms...`)
        await sleep(delay)
        continue
      }
      throw err
    }
  }
}

// 通过连接池执行查询（带重试）
async function query(sql, params = []) {
  if (!_pool) throw new Error('数据库未初始化，请先调用 init()')
  return executeWithRetry(_pool, sql, params)
}

// 获取连接池实例（供事务等高级用途）
function getPool() {
  if (!_pool) throw new Error('数据库未初始化，请先调用 init()')
  return _pool
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

module.exports = { init, query, getPool }
