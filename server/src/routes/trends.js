const express = require('express')
const trendModel = require('../models/trend')
const scraper = require('../services/scraper')

const router = express.Router()

// 获取趋势列表（分页 + 分类筛选）
router.get('/', (req, res) => {
  const page = parseInt(req.query.page) || 1
  const pageSize = parseInt(req.query.pageSize) || 20
  const category = req.query.category || 'all'

  const result = trendModel.getList({ page, pageSize, category })
  res.json(result)
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
