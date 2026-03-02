// server/src/middleware/auth.js
// 从请求头提取微信用户身份信息

function extractWxUser(req, res, next) {
  // 微信云托管自动注入的用户信息
  req.wxUser = {
    openid: req.headers['x-wx-openid'] || '',
    appid: req.headers['x-wx-appid'] || '',
    unionid: req.headers['x-wx-unionid'] || '',
    source: req.headers['x-wx-source'] || '', // 调用来源标识
    env: req.headers['x-wx-env'] || ''        // 云环境 ID
  }
  
  // 开发模式下允许无 openid 访问
  if (process.env.NODE_ENV === 'development' && !req.wxUser.openid) {
    req.wxUser.openid = 'dev-user'
  }
  
  next()
}

// 强制要求登录的中间件（用于需要用户身份的接口）
function requireAuth(req, res, next) {
  if (!req.wxUser.openid) {
    return res.status(401).json({ message: '未授权：缺少用户身份' })
  }
  next()
}

// 验证请求来自微信生态（防止外部直接调用）
function requireWxSource(req, res, next) {
  // 开发模式下跳过来源检查
  if (process.env.NODE_ENV === 'development') {
    return next()
  }
  if (!req.wxUser.source) {
    return res.status(403).json({ message: '禁止访问：非微信生态调用' })
  }
  next()
}

module.exports = { extractWxUser, requireAuth, requireWxSource }
