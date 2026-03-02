const express = require('express')
const trendModel = require('../models/trend')
const scraper = require('../services/scraper')

const router = express.Router()

// 获取趋势列表（分页 + 分类筛选 + 搜索）
router.get('/', (req, res) => {
  const page = parseInt(req.query.page) || 1
  const pageSize = parseInt(req.query.pageSize) || 20
  const category = req.query.category || 'all'
  const search = req.query.search || ''

  const result = trendModel.getList({ page, pageSize, category, search })
  res.json(result)
})

// 根据 ID 获取单条趋势详情
router.get('/:id', (req, res) => {
  const id = parseInt(req.params.id)
  if (isNaN(id)) {
    return res.status(400).json({ message: '无效的趋势 ID' })
  }
  const trend = trendModel.getById(id)
  if (!trend) {
    return res.status(404).json({ message: '趋势不存在' })
  }
  res.json(trend)
})

// 手动触发抓取刷新
router.post('/refresh', async (req, res, next) => {
  try {
    const added = await scraper.scrapeAll()
    res.json({
      message: `刷新完成，新增 ${added} 条趋势`,
      added
    })
  } catch (err) {
    next(err)
  }
})

module.exports = router
