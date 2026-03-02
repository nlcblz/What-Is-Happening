const express = require('express')
const sourceModel = require('../models/source')

const router = express.Router()

// 获取所有数据源
router.get('/', (req, res) => {
  const sources = sourceModel.getAll()
  res.json({
    sources,
    total: sources.length
  })
})

// 获取分类列表
router.get('/categories', (req, res) => {
  const sources = sourceModel.getAll()
  const categories = [...new Set(sources.map(s => s.category))].sort()
  res.json({
    categories,
    total: categories.length
  })
})

module.exports = router
