// utils/api.js
// 网络请求封装 — 支持双模式：本地开发 (wx.request) 和云托管 (wx.cloud.callContainer)
const config = require('./config')

// 将对象转换为 URL 查询字符串
function buildQueryString(params) {
  if (!params || typeof params !== 'object') return ''
  
  const filtered = Object.entries(params)
    .filter(([_, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
  
  return filtered.length > 0 ? `?${filtered.join('&')}` : ''
}

// 基础请求方法 — 支持本地和云托管双模式
function request(options) {
  const { url, method = 'GET', data, header = {} } = options

  // 从本地存储读取 API 认证信息
  const apiKey = wx.getStorageSync('apiKey') || ''
  const aiProvider = wx.getStorageSync('aiProvider') || 'deepseek'

  // 云托管模式
  if (config.mode === 'cloud') {
    // 处理 GET 请求的查询参数 — 云托管需要手动拼接 URL
    let path = url
    if (method === 'GET' && data) {
      path = `${url}${buildQueryString(data)}`
    }

    return new Promise((resolve, reject) => {
      wx.cloud.callContainer({
        config: { env: config.cloudEnv },
        path: path,
        method: method,
        header: {
          'X-WX-SERVICE': config.cloudService,
          'Content-Type': 'application/json',
          // openid 由云托管自动注入，无需手动设置
          // 但仍需传递 API key 和 AI provider 用于 AI 功能
          'X-API-Key': apiKey,
          'X-AI-Provider': aiProvider,
          ...header
        },
        data: method !== 'GET' ? data : undefined, // GET 不需要 body
        success(res) {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(res.data)
          } else {
            console.error(`[WIH] 云托管请求失败: ${res.statusCode}`, res.data)
            reject(new Error(res.data.message || `请求失败: ${res.statusCode}`))
          }
        },
        fail(err) {
          console.error('[WIH] 云托管调用错误:', err)
          reject(new Error('云托管调用失败，请检查网络设置'))
        }
      })
    })
  }

  // 本地开发模式 — 使用原有的 wx.request 逻辑
  const fullUrl = url.startsWith('http') ? url : `${config.apiBaseUrl}${url}`

  return new Promise((resolve, reject) => {
    wx.request({
      url: fullUrl,
      method,
      data,
      header: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
        'X-AI-Provider': aiProvider,
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

// 搜索趋势
function searchTrends(keyword, params = {}) {
  const { page = 1, pageSize = config.pageSize } = params
  return get('/api/trends', { page, pageSize, search: keyword })
}

// 根据 ID 获取单条趋势详情
function getTrendById(id) {
  return get(`/api/trends/${id}`)
}

// 刷新趋势数据
function refreshTrends() {
  return post('/api/trends/refresh')
}

// 生成 AI 摘要
function summarize(data) {
  const apiKey = wx.getStorageSync('apiKey') || ''
  const aiProvider = wx.getStorageSync('aiProvider') || 'deepseek'
  return post('/api/summarize', {
    ...data,
    apiKey,
    provider: aiProvider
  })
}

// 健康检查
function healthCheck() {
  return get('/health')
}

// 获取数据源列表
function getSources() {
  return get('/api/sources')
}

// 获取分类列表
function getCategories() {
  return get('/api/sources/categories')
}

module.exports = { request, get, post, getTrends, searchTrends, getTrendById, refreshTrends, summarize, healthCheck, getSources, getCategories }
