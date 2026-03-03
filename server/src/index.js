const express = require('express')
const cors = require('cors')
const config = require('./config')
const mountRoutes = require('./routes')
const { extractWxUser } = require('./middleware/auth')
const dbModule = require('./models/db')
const sourceModel = require('./models/source')
const scraper = require('./services/scraper')

const app = express()

// ─── 就绪状态标志 ───
// 云托管健康探针检测端口连通性，必须立即打开端口
// API 接口在 DB 就绪前返回 503，防止脏数据
let _ready = false
function isReady() { return _ready }

// 中间件：CORS
app.use(cors())

// 中间件：JSON 解析
app.use(express.json())

// 中间件：提取微信用户身份
app.use(extractWxUser)

// 中间件：就绪检查 — /api 路径在 DB 就绪前返回 503，/health 不受影响
app.use('/api', (req, res, next) => {
  if (!_ready) {
    return res.status(503).json({
      error: '服务初始化中',
      message: '数据库正在连接，请稍后重试'
    })
  }
  next()
})

// 挂载所有路由（含 /health）
mountRoutes(app)

// 全局错误处理中间件
app.use((err, req, res, next) => {
  console.error('[WIH] 错误:', err)
  res.status(500).json({
    error: '内部服务器错误',
    message: err.message
  })
})

// ─── 启动：先开端口，再异步初始化 ───
// 关键：app.listen() 必须立即执行，否则云托管探针超时报错
// "Liveness probe failed: dial tcp ...connect: connection refused"
const port = config.port

app.listen(port, () => {
  console.log(`[WIH Server] 服务启动于端口 ${port}`)
  console.log(`[WIH Server] 环境: ${config.nodeEnv}`)
})

// 后台异步初始化 — 不阻塞端口监听
;(async () => {
  try {
    // 1. 连接 MySQL 数据库 + 自动建表
    await dbModule.init()
    console.log('[WIH Server] MySQL 数据库已就绪')

    // 标记就绪 — DB 连接成功即可响应 API
    _ready = true
    console.log('[WIH Server] 初始化完成，服务就绪')
  } catch (err) {
    console.error('[WIH] MySQL 初始化失败:', err)
    // 不调用 process.exit — 保持端口存活，让探针通过
    // 运维可通过 /health 的 ready: false 判断异常
    return
  }

  // 2. 初始化数据源（种子数据）— 失败不影响服务
  try {
    await sourceModel.init()
  } catch (err) {
    console.error('[WIH] 种子数据播种失败:', err.message)
  }

  // 3. 延迟首次抓取 — 避免冷启动时与用户请求争抢资源
  setTimeout(async () => {
    try {
      const added = await scraper.scrapeAll()
      console.log(`[WIH] 首次抓取完成，新增 ${added} 条`)
    } catch (err) {
      console.error('[WIH] 首次抓取失败:', err.message)
    }

    // 4. 启动定时抓取（每 30 分钟）
    scraper.startScheduler('*/30 * * * *')
  }, 10000) // 10 秒后再开始抓取，给用户请求留出资源
})()

// 导出就绪状态供 health 路由使用
app.locals.isReady = isReady

module.exports = app
