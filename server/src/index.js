const express = require('express')
const cors = require('cors')
const config = require('./config')
const mountRoutes = require('./routes')
const sourceModel = require('./models/source')
const scraper = require('./services/scraper')

const app = express()

// 中间件：CORS
app.use(cors())

// 中间件：JSON 解析
app.use(express.json())

// 挂载所有路由
mountRoutes(app)

// 全局错误处理中间件
app.use((err, req, res, next) => {
  console.error('[WIH] 错误:', err)
  res.status(500).json({
    error: '内部服务器错误',
    message: err.message
  })
})

// 初始化数据源 + 启动服务
const port = config.port
sourceModel.init()

app.listen(port, async () => {
  console.log(`[WIH Server] 服务启动于端口 ${port}`)
  console.log(`[WIH Server] 环境: ${config.nodeEnv}`)

  // 首次抓取
  try {
    const added = await scraper.scrapeAll()
    console.log(`[WIH] 首次抓取完成，新增 ${added} 条`)
  } catch (err) {
    console.error('[WIH] 首次抓取失败:', err.message)
  }

  // 启动定时抓取（每 30 分钟）
  scraper.startScheduler('*/30 * * * *')
})

module.exports = app
