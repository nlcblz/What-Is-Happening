const express = require('express')
const trendModel = require('../models/trend')
const scraper = require('../services/scraper')
const { translateContent, isChinese } = require('../services/summarize')

const router = express.Router()

// 获取趋势列表（分页 + 分类筛选 + 搜索）
router.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1
    const pageSize = parseInt(req.query.pageSize) || 20
    const category = req.query.category || 'all'
    const search = req.query.search || ''

    const result = await trendModel.getList({ page, pageSize, category, search })
    res.json(result)
  } catch (err) {
    next(err)
  }
})

// 根据 ID 获取单条趋势详情
router.get('/:id', async (req, res, next) => {
  try {
    const id = req.params.id
    const trend = await trendModel.getById(id)
    if (!trend) {
      return res.status(404).json({ message: '趋势不存在' })
    }
    res.json(trend)
  } catch (err) {
    next(err)
  }
})

// 手动触发抓取刷新（异步执行，立即返回，避免超时）
router.post('/refresh', (req, res) => {
  // 立即响应，后台异步抓取
  res.json({ message: '刷新任务已触发', status: 'accepted' })

  // 异步执行抓取，不阻塞响应
  scraper.scrapeAll()
    .then(added => console.log(`[WIH] 手动刷新完成，新增 ${added} 条`))
    .catch(err => console.error('[WIH] 手动刷新失败:', err.message))
})

// 翻译指定文章（POST /:id/translate）
router.post('/:id/translate', async (req, res, next) => {
  try {
    const id = req.params.id
    const trend = await trendModel.getById(id)
    if (!trend) {
      return res.status(404).json({ message: '趋势不存在' })
    }

    // 中文内容不翻译
    if (isChinese(trend.content || trend.title)) {
      return res.json({ ...trend, needsTranslation: false })
    }

    // 已翻译的直接返回
    if (trend.translated && trend.contentZh) {
      return res.json({ ...trend, needsTranslation: false })
    }

    // 调用 AI 翻译
    const { contentZh, paragraphs } = await translateContent(trend.content, {
      provider: req.body.provider,
      apiKey: req.body.apiKey
    })

    // 保存翻译结果
    const updated = await trendModel.updateTranslation(id, contentZh)
    res.json({ ...updated, paragraphs, needsTranslation: true })
  } catch (err) {
    next(err)
  }
})

module.exports = router
