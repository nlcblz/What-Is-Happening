const express = require('express')

const router = express.Router()

// 健康检查端点
// 云托管 Liveness Probe 通过端口连通性判断容器存活
// 始终返回 200 — 即使 DB 还在初始化中
// ready 字段标识 API 是否已就绪，运维可据此判断服务状态
router.get('/', (req, res) => {
  const isReady = req.app.locals.isReady
  res.json({
    status: 'ok',
    ready: isReady ? isReady() : false,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  })
})

module.exports = router
