// server/src/routes/posts.js
// 管理员发布内容 API
const express = require('express')
const multer = require('multer')
const { marked } = require('marked')
const postModel = require('../models/post')

const router = express.Router()

// 配置 multer 用于文件上传（内存存储）
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 限制 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/markdown' || file.originalname.endsWith('.md')) {
      cb(null, true)
    } else {
      cb(new Error('只支持 .md 文件'))
    }
  }
})

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

// 上传 MD 文件创建草稿 — 管理接口
router.post('/upload-md', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.wxUser?.isAdmin) {
      return res.status(403).json({ message: '需要管理员权限' })
    }

    let mdContent = ''
    let filename = 'untitled.md'

    // 支持两种上传方式：
    // 1. 直接上传文件（本地开发模式）
    // 2. 云存储 fileID（云托管模式）
    if (req.file) {
      // 本地上传模式
      mdContent = req.file.buffer.toString('utf-8')
      filename = req.file.originalname || 'untitled.md'
    } else if (req.body.fileID) {
      // 云存储模式 — 需要下载文件内容
      // 注意：云托管环境中需要使用云开发 SDK 下载
      // 这里暂时返回错误，提示使用其他方式
      return res.status(400).json({ 
        message: '云存储上传暂不支持，请使用文件直传' 
      })
    } else {
      return res.status(400).json({ message: '缺少文件' })
    }

    // 解析 Markdown
    // 提取标题：优先使用第一个 # 标题，否则使用文件名
    let title = filename.replace(/\.md$/i, '')
    const titleMatch = mdContent.match(/^#\s+(.+)$/m)
    if (titleMatch) {
      title = titleMatch[1].trim()
    }

    // 提取摘要：取前 200 字符的纯文本
    const plainText = mdContent
      .replace(/^#.*$/gm, '')  // 移除标题
      .replace(/[*_`~\[\]()]/g, '')  // 移除 Markdown 格式符号
      .replace(/\n+/g, ' ')  // 换行转空格
      .trim()
    const summary = plainText.slice(0, 200) + (plainText.length > 200 ? '...' : '')

    // 转换为 HTML
    const contentHtml = marked(mdContent)

    // 创建草稿文章
    const post = await postModel.create({
      title,
      contentMd: mdContent,
      contentHtml,
      summary,
      category: 'announcement',
      author: req.wxUser.openid || '管理员',
      status: 'draft'
    })

    res.status(201).json({
      success: true,
      message: '文件上传成功，已创建草稿',
      post
    })
  } catch (err) {
    next(err)
  }
})

module.exports = router
