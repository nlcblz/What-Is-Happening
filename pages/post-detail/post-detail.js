// pages/post-detail/post-detail.js
// 公告详情页 — 展示管理员发布的单篇文章
const api = require('../../utils/api')
const { formatTimeAgo } = require('../../utils/util')

Page({
  data: {
    post: null,
    loading: true,
    error: false,
    timeAgo: '',
    publishTime: ''
  },

  onLoad(options) {
    const id = options.id
    if (!id) {
      this.setData({ loading: false, error: true })
      wx.showToast({ title: '参数错误', icon: 'none' })
      return
    }
    this.loadPost(id)
  },

  /**
   * 加载公告详情
   */
  loadPost(id) {
    this.setData({ loading: true, error: false })

    api.getPostById(id)
      .then(post => {
        // 格式化发布时间
        const publishTime = post.publishedAt
          ? new Date(post.publishedAt).toLocaleString('zh-CN', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit'
            })
          : '未发布'

        this.setData({
          post,
          loading: false,
          error: false,
          timeAgo: formatTimeAgo(post.publishedAt),
          publishTime
        })

        // 设置页面标题
        wx.setNavigationBarTitle({ title: post.title || '公告详情' })
      })
      .catch(err => {
        console.error('[WIH] 加载公告详情失败:', err.message)
        this.setData({ loading: false, error: true })
        wx.showToast({ title: '加载失败', icon: 'none' })
      })
  },

  /**
   * 分享
   */
  onShareAppMessage() {
    const post = this.data.post
    return {
      title: post ? post.title : '官方公告',
      path: `/pages/post-detail/post-detail?id=${post ? post.id : ''}`
    }
  }
})
