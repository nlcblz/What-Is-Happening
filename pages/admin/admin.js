// pages/admin/admin.js
// 内容管理页 — 管理员专用，文章列表 + MD文件上传
const api = require('../../utils/api')
const { formatTimeAgo } = require('../../utils/util')

Page({
  data: {
    posts: [],
    loading: true,
    refreshing: false,
    page: 1,
    hasMore: true,
    statusFilter: 'all',  // all, draft, published
    uploading: false
  },

  onLoad() {
    this.loadPosts()
  },

  onShow() {
    // 返回时刷新列表
    if (this.data.posts.length > 0) {
      this.loadPosts(true)
    }
  },

  /**
   * 加载文章列表
   */
  loadPosts(refresh = false) {
    const page = refresh ? 1 : this.data.page

    if (!refresh) {
      this.setData({ loading: true })
    }

    api.getAdminPosts({ 
      page, 
      pageSize: 20, 
      status: this.data.statusFilter 
    })
      .then(result => {
        const formatted = result.data.map(post => ({
          ...post,
          timeAgo: formatTimeAgo(post.createdAt),
          statusLabel: this.getStatusLabel(post.status)
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
        console.error('[WIH] 加载文章列表失败:', err.message)
        this.setData({ loading: false, refreshing: false })
        wx.showToast({ title: '加载失败', icon: 'none' })
      })
  },

  /**
   * 获取状态标签
   */
  getStatusLabel(status) {
    const map = {
      draft: '草稿',
      published: '已发布',
      archived: '已归档'
    }
    return map[status] || status
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
   * 切换状态筛选
   */
  onFilterChange(e) {
    const filters = ['all', 'draft', 'published']
    this.setData({ statusFilter: filters[e.detail.value] })
    this.loadPosts(true)
  },

  /**
   * 上传 MD 文件
   */
  onUploadMd() {
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['md', 'markdown', 'txt'],
      success: res => {
        const file = res.tempFiles[0]
        if (!file) return

        // 检查文件大小（限制 1MB）
        if (file.size > 1024 * 1024) {
          wx.showToast({ title: '文件过大，请控制在 1MB 以内', icon: 'none' })
          return
        }

        this.setData({ uploading: true })
        wx.showLoading({ title: '上传中...' })

        api.uploadMdFile(file.path)
          .then(post => {
            wx.hideLoading()
            this.setData({ uploading: false })
            wx.showToast({ title: '上传成功', icon: 'success' })
            // 刷新列表
            this.loadPosts(true)
          })
          .catch(err => {
            wx.hideLoading()
            this.setData({ uploading: false })
            console.error('[WIH] 上传失败:', err.message)
            wx.showToast({ title: '上传失败', icon: 'none' })
          })
      }
    })
  },

  /**
   * 点击文章卡片 — 预览
   */
  onPostTap(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/post-detail/post-detail?id=${id}` })
  },

  /**
   * 发布/取消发布
   */
  onTogglePublish(e) {
    const { id, status } = e.currentTarget.dataset
    const publish = status !== 'published'
    const actionText = publish ? '发布' : '取消发布'

    wx.showModal({
      title: '确认操作',
      content: `确定要${actionText}这篇文章吗？`,
      success: res => {
        if (!res.confirm) return

        wx.showLoading({ title: '处理中...' })
        api.publishPost(id, publish)
          .then(() => {
            wx.hideLoading()
            wx.showToast({ title: `${actionText}成功`, icon: 'success' })
            this.loadPosts(true)
          })
          .catch(err => {
            wx.hideLoading()
            wx.showToast({ title: `${actionText}失败`, icon: 'none' })
          })
      }
    })
  },

  /**
   * 删除文章
   */
  onDeletePost(e) {
    const id = e.currentTarget.dataset.id

    wx.showModal({
      title: '确认删除',
      content: '删除后无法恢复，确定要删除吗？',
      confirmColor: '#e94560',
      success: res => {
        if (!res.confirm) return

        wx.showLoading({ title: '删除中...' })
        api.deletePost(id)
          .then(() => {
            wx.hideLoading()
            wx.showToast({ title: '删除成功', icon: 'success' })
            this.loadPosts(true)
          })
          .catch(err => {
            wx.hideLoading()
            wx.showToast({ title: '删除失败', icon: 'none' })
          })
      }
    })
  }
})
