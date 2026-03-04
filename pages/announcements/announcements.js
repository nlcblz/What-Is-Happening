// pages/announcements/announcements.js
// 官方公告列表页
const api = require('../../utils/api')
const { formatTimeAgo } = require('../../utils/util')

Page({
  data: {
    posts: [],
    loading: true,
    refreshing: false,
    page: 1,
    hasMore: true
  },

  onLoad() {
    this.loadPosts()
  },

  onShow() {
    // 每次显示时刷新（可能有新公告）
    if (this.data.posts.length > 0) {
      this.loadPosts(true)
    }
  },

  /**
   * 加载公告列表
   * @param {boolean} refresh - 是否刷新
   */
  loadPosts(refresh = false) {
    const page = refresh ? 1 : this.data.page

    if (!refresh) {
      this.setData({ loading: true })
    }

    api.getPosts({ page, pageSize: 20 })
      .then(result => {
        // 格式化时间
        const formatted = result.data.map(post => ({
          ...post,
          timeAgo: formatTimeAgo(post.publishedAt)
        }))

        this.setData({
          posts: refresh ? formatted : this.data.posts.concat(formatted),
          page: page + 1,
          hasMore: result.hasMore,
          loading: false,
          refreshing: false
        })
      })
      .catch(err => {
        console.error('[WIH] 加载公告失败:', err.message)
        this.setData({ loading: false, refreshing: false })
        wx.showToast({ title: '加载失败', icon: 'none' })
      })
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.setData({ refreshing: true })
    this.loadPosts(true)
  },

  /**
   * 上拉加载更多
   */
  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadPosts()
    }
  },

  /**
   * 点击公告卡片
   */
  onPostTap(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/post-detail/post-detail?id=${id}` })
  }
})
