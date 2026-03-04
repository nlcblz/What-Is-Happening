// server/src/models/post.js
// 管理员发布内容模型 — MySQL 版
const db = require('./db')

// 行数据 → 应用对象
function rowToPost(row) {
  if (!row) return null
  return {
    id: String(row.id),
    title: row.title,
    contentMd: row.content_md || '',
    contentHtml: row.content_html || '',
    summary: row.summary || '',
    category: row.category || 'announcement',
    coverUrl: row.cover_url || '',
    author: row.author || '管理员',
    status: row.status || 'draft',
    publishedAt: row.published_at ? row.published_at.toISOString() : null,
    createdAt: row.created_at ? row.created_at.toISOString() : null,
    updatedAt: row.updated_at ? row.updated_at.toISOString() : null
  }
}

// 创建文章
async function create(post) {
  const sql = `INSERT INTO admin_posts (title, content_md, content_html, summary, category, cover_url, author, status, published_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  const params = [
    post.title,
    post.contentMd || '',
    post.contentHtml || '',
    post.summary || '',
    post.category || 'announcement',
    post.coverUrl || '',
    post.author || '管理员',
    post.status || 'draft',
    post.status === 'published' ? new Date() : null
  ]
  const result = await db.query(sql, params)
  return getById(result.insertId)
}

// 更新文章
async function update(id, data) {
  const fields = []
  const params = []

  if (data.title !== undefined) {
    fields.push('title = ?')
    params.push(data.title)
  }
  if (data.contentMd !== undefined) {
    fields.push('content_md = ?')
    params.push(data.contentMd)
  }
  if (data.contentHtml !== undefined) {
    fields.push('content_html = ?')
    params.push(data.contentHtml)
  }
  if (data.summary !== undefined) {
    fields.push('summary = ?')
    params.push(data.summary)
  }
  if (data.category !== undefined) {
    fields.push('category = ?')
    params.push(data.category)
  }
  if (data.coverUrl !== undefined) {
    fields.push('cover_url = ?')
    params.push(data.coverUrl)
  }
  if (data.author !== undefined) {
    fields.push('author = ?')
    params.push(data.author)
  }
  if (data.status !== undefined) {
    fields.push('status = ?')
    params.push(data.status)
    // 如果是发布状态且之前未发布，设置发布时间
    if (data.status === 'published') {
      fields.push('published_at = COALESCE(published_at, NOW())')
    }
  }

  if (fields.length === 0) {
    return getById(id)
  }

  params.push(parseInt(id, 10))
  const sql = `UPDATE admin_posts SET ${fields.join(', ')} WHERE id = ?`
  await db.query(sql, params)
  return getById(id)
}

// 删除文章
async function remove(id) {
  await db.query('DELETE FROM admin_posts WHERE id = ?', [parseInt(id, 10)])
  return { success: true }
}

// 根据 ID 获取文章
async function getById(id) {
  const rows = await db.query('SELECT * FROM admin_posts WHERE id = ?', [parseInt(id, 10)])
  return rows.length > 0 ? rowToPost(rows[0]) : null
}

// 获取文章列表（分页、状态筛选）
async function getList({ page = 1, pageSize = 20, status, category } = {}) {
  const conditions = []
  const params = []

  // 状态筛选
  if (status && status !== 'all') {
    conditions.push('status = ?')
    params.push(status)
  }

  // 分类筛选
  if (category && category !== 'all') {
    conditions.push('category = ?')
    params.push(category)
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  // 获取总数
  const countRows = await db.query(`SELECT COUNT(*) AS total FROM admin_posts ${whereClause}`, params)
  const total = countRows[0].total

  // 分页查询
  const offset = (page - 1) * pageSize
  const dataRows = await db.query(
    `SELECT * FROM admin_posts ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  )

  return {
    data: dataRows.map(rowToPost),
    total,
    page,
    pageSize,
    hasMore: offset + dataRows.length < total
  }
}

// 获取已发布的文章列表（供小程序前端调用）
async function getPublished({ page = 1, pageSize = 20, category } = {}) {
  const conditions = ["status = 'published'"]
  const params = []

  if (category && category !== 'all') {
    conditions.push('category = ?')
    params.push(category)
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`

  // 获取总数
  const countRows = await db.query(`SELECT COUNT(*) AS total FROM admin_posts ${whereClause}`, params)
  const total = countRows[0].total

  // 分页查询
  const offset = (page - 1) * pageSize
  const dataRows = await db.query(
    `SELECT * FROM admin_posts ${whereClause} ORDER BY published_at DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  )

  return {
    data: dataRows.map(rowToPost),
    total,
    page,
    pageSize,
    hasMore: offset + dataRows.length < total
  }
}

module.exports = { create, update, remove, getById, getList, getPublished }
