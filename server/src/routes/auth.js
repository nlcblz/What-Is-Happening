// server/src/routes/auth.js
// 用户身份验证相关 API
const express = require('express')

const router = express.Router()

// 检测当前用户是否为管理员
router.get('/check-admin', (req, res) => {
  res.json({
    isAdmin: req.wxUser?.isAdmin || false,
    openid: req.wxUser?.openid || ''
  })
})

module.exports = router
