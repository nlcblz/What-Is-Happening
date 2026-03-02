// pages/detail/detail.js
// 趋势详情页 — 展示单条趋势的完整信息

const api = require('../../utils/api')
const { formatTimeAgo, categoryLabelMap } = require('../../utils/util')

Page({
  data: {
    trend: null,       // 趋势详情对象
    loading: true,     // 加载状态
    error: false,      // 是否加载失败
    timeAgo: '',       // 相对时间
    categoryLabel: '', // 分类中文名
    publishTime: ''    // 格式化的发布时间
  },

  onLoad(options) {
    const id = options.id
    if (!id) {
      this.setData({ loading: false, error: true })
      wx.showToast({ title: '参数错误', icon: 'none' })
      return
    }
    this.loadTrendDetail(parseInt(id))
  },

  /**
   * 加载趋势详情
   * @param {number} id - 趋势 ID
   */
  loadTrendDetail(id) {
    this.setData({ loading: true, error: false })

    api.getTrendById(id)
      .then(trend => {
        // 格式化发布时间为可读字符串
        const publishTime = trend.publishedAt
          ? new Date(trend.publishedAt).toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          })
          : '未知'

        this.setData({
          trend,
          loading: false,
          error: false,
          timeAgo: formatTimeAgo(trend.publishedAt),
          categoryLabel: categoryLabelMap[trend.category] || trend.category || '综合',
          publishTime
        })
      })
      .catch(err => {
        console.error('[WIH] 加载趋势详情失败:', err.message)
        this.setData({ loading: false, error: true })
        wx.showToast({ title: '加载失败，请稍后重试', icon: 'none', duration: 2000 })
      })
  },

  /**
   * 复制原文链接到剪贴板
   */
  onCopyLink() {
    const url = this.data.trend && this.data.trend.url
    if (!url) {
      wx.showToast({ title: '暂无原文链接', icon: 'none' })
      return
    }
    wx.setClipboardData({
      data: url,
      success() {
        wx.showToast({ title: '链接已复制', icon: 'success' })
      }
    })
  },

  /**
   * 分享给好友
   */
  onShareAppMessage() {
    const trend = this.data.trend
    return {
      title: trend ? trend.title : 'What Is Happening',
      path: `/pages/detail/detail?id=${trend ? trend.id : ''}`
    }
  }
})
