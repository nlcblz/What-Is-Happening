// server/src/routes/posts.js
// 管理员发布内容 API
const express = require('express')
const postModel = require('../models/post')

const router = express.Router()

// 获取已发布文章列表（公开接口，供小程序前端调用）
router.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1
    const pageSize = parseInt(req.query.pageSize) || 20
    const category = req.query.category || 'all'

    const result = await postModel.getPublished({ page, pageSize, category })
    res.json(result)
  } catch (err) {
    next(err)
  }
})

// 根据 ID 获取单篇文章详情（公开接口）
router.get('/:id', async (req, res, next) => {
  try {
    const id = req.params.id
    const post = await postModel.getById(id)
    if (!post) {
      return res.status(404).json({ message: '文章不存在' })
    }
    // 非管理员只能查看已发布的
    if (post.status !== 'published' && !req.wxUser?.isAdmin) {
      return res.status(404).json({ message: '文章不存在' })
    }
    res.json(post)
  } catch (err) {
    next(err)
  }
})

// ========== 以下为管理接口（需管理员身份） ==========

// 获取所有文章（含草稿）— 管理接口
router.get('/admin/list', async (req, res, next) => {
  try {
    // 简单的管理员验证（可后续增强为 JWT 或云托管身份）
    if (!req.wxUser?.isAdmin) {
      return res.status(403).json({ message: '需要管理员权限' })
    }

    const page = parseInt(req.query.page) || 1
    const pageSize = parseInt(req.query.pageSize) || 20
    const status = req.query.status || 'all'
    const category = req.query.category || 'all'

    const result = await postModel.getList({ page, pageSize, status, category })
    res.json(result)
  } catch (err) {
    next(err)
  }
})

// 创建文章 — 管理接口
router.post('/', async (req, res, next) => {
  try {
    if (!req.wxUser?.isAdmin) {
      return res.status(403).json({ message: '需要管理员权限' })
    }

    const { title, contentMd, contentHtml, summary, category, coverUrl, status } = req.body
    if (!title) {
      return res.status(400).json({ message: '标题不能为空' })
    }

    const post = await postModel.create({
      title,
      contentMd,
      contentHtml,
      summary,
      category,
      coverUrl,
      author: req.wxUser.openid || '管理员',
      status: status || 'draft'
    })
    res.status(201).json(post)
  } catch (err) {
    next(err)
  }
})

// 更新文章 — 管理接口
router.put('/:id', async (req, res, next) => {
  try {
    if (!req.wxUser?.isAdmin) {
      return res.status(403).json({ message: '需要管理员权限' })
    }

    const id = req.params.id
    const existing = await postModel.getById(id)
    if (!existing) {
      return res.status(404).json({ message: '文章不存在' })
    }

    const updated = await postModel.update(id, req.body)
    res.json(updated)
  } catch (err) {
    next(err)
  }
})

// 删除文章 — 管理接口
router.delete('/:id', async (req, res, next) => {
  try {
    if (!req.wxUser?.isAdmin) {
      return res.status(403).json({ message: '需要管理员权限' })
    }

    const id = req.params.id
    const existing = await postModel.getById(id)
    if (!existing) {
      return res.status(404).json({ message: '文章不存在' })
    }

    await postModel.remove(id)
    res.json({ success: true, message: '删除成功' })
  } catch (err) {
    next(err)
  }
})

// 发布/取消发布 — 管理接口
router.post('/:id/publish', async (req, res, next) => {
  try {
    if (!req.wxUser?.isAdmin) {
      return res.status(403).json({ message: '需要管理员权限' })
    }

    const id = req.params.id
    const { publish } = req.body // true = 发布, false = 取消发布

    const existing = await postModel.getById(id)
    if (!existing) {
      return res.status(404).json({ message: '文章不存在' })
    }

    const newStatus = publish ? 'published' : 'draft'
    const updated = await postModel.update(id, { status: newStatus })
    res.json(updated)
  } catch (err) {
    next(err)
  }
})

module.exports = router
