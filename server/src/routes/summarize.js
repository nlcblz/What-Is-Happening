const express = require('express')
const trendModel = require('../models/trend')
const summarizeService = require('../services/summarize')

const router = express.Router()

// 对指定趋势生成 AI 摘要
router.post('/', async (req, res, next) => {
  try {
    const { trendId, provider, apiKey } = req.body

    // 如果指定了 trendId，对单条趋势生成摘要
    if (trendId) {
      const trend = await trendModel.getById(trendId)
      if (!trend) {
        return res.status(404).json({ error: '趋势不存在' })
      }

      const result = await summarizeService.summarizeArticle(trend, { provider, apiKey })
      await trendModel.updateSummary(trend.id, result.summary, result.summaryZh)

      return res.json({
        message: '摘要生成成功',
        data: { ...trend, ...result }
      })
    }

    // 否则对所有未摘要的趋势批量生成
    const unsummarized = await trendModel.getUnsummarized(5)
    if (unsummarized.length === 0) {
      return res.json({ message: '没有需要摘要的趋势', data: [] })
    }

    const results = await summarizeService.summarizeBatch(unsummarized, { provider, apiKey })

    // 更新数据库
    for (const item of results) {
      await trendModel.updateSummary(item.id, item.summary, item.summaryZh)
    }

    res.json({
      message: `已生成 ${results.length} 条摘要`,
      data: results
    })
  } catch (err) {
    next(err)
  }
})

module.exports = router
