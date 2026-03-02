// utils/api.js
// 网络请求封装 — 基于 wx.request 的 Promise 封装
const config = require('./config')

// 基础请求方法
function request(options) {
  const { url, method = 'GET', data, header = {} } = options

  // 拼接完整 URL
  const fullUrl = url.startsWith('http') ? url : `${config.apiBaseUrl}${url}`

  return new Promise((resolve, reject) => {
    wx.request({
      url: fullUrl,
      method,
      data,
      header: {
        'Content-Type': 'application/json',
        ...header
      },
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data)
        } else {
          console.error(`[WIH] 请求失败: ${res.statusCode}`, res.data)
          reject(new Error(res.data.message || `请求失败: ${res.statusCode}`))
        }
      },
      fail(err) {
        console.error('[WIH] 网络错误:', err)
        reject(new Error('网络连接失败，请检查网络设置'))
      }
    })
  })
}

// GET 请求
function get(url, data) {
  return request({ url, method: 'GET', data })
}

// POST 请求
function post(url, data) {
  return request({ url, method: 'POST', data })
}

// ========== 业务 API ==========

// 获取趋势列表
function getTrends(params = {}) {
  const { page = 1, pageSize = config.pageSize, category = 'all' } = params
  return get('/api/trends', { page, pageSize, category })
}

// 刷新趋势数据
function refreshTrends() {
  return post('/api/trends/refresh')
}

// 生成 AI 摘要
function summarize(data) {
  return post('/api/summarize', data)
}

// 健康检查
function healthCheck() {
  return get('/health')
}

module.exports = { request, get, post, getTrends, refreshTrends, summarize, healthCheck }
