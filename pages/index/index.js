// pages/index/index.js
// 热点页 — 趋势卡片列表（API 接入版）

const api = require('../../utils/api')
const config = require('../../utils/config')
const { enrichTrends } = require('../../utils/util')

// Mock 数据 — 后端不可用时的降级方案
function createMockTrends() {
  const now = new Date()
  return enrichTrends([
    {
      id: 1,
      title: 'OpenAI Announces GPT-5 with Breakthrough Reasoning',
      summaryZh: 'OpenAI 发布了 GPT-5，在多步推理和工具使用能力方面取得重大突破。',
      sourceName: 'Hacker News',
      category: 'tech',
      imageUrl: '',
      publishedAt: new Date(now - 2 * 3600000).toISOString()
    },
    {
      id: 2,
      title: 'UN Climate Summit Reaches Historic Agreement',
      summaryZh: '联合国气候峰会上各国领导人就碳排放目标达成历史性协议。',
      sourceName: 'BBC News',
      category: 'international',
      imageUrl: '',
      publishedAt: new Date(now - 5 * 3600000).toISOString()
    }
  ])
}

Page({
  data: {
    trends: [],
    loading: false,
    refreshing: false,
    page: 1,
    hasMore: true,
    networkError: false,
    categories: [
      { id: 'all', name: '全部' },
      { id: 'tech', name: '科技' },
      { id: 'international', name: '国际' },
      { id: 'finance', name: '财经' },
      { id: 'entertainment', name: '娱乐' },
      { id: 'society', name: '社会' }
    ],
    activeCategory: 'all'
  },

  onLoad() {
    console.log('[WIH] Index page loaded')
    this._initCategories()
    this.loadTrends(true)
  },

  onShow() {
    // 在 onShow 中检查兴趣变化，支持从设置页返回后动态更新
    const interests = wx.getStorageSync('interests') || []
    const interestsChanged = JSON.stringify(interests) !== JSON.stringify(this._interests)
    
    if (interestsChanged) {
      console.log('[WIH] 用户兴趣已变更，更新分类标签')
      this._interests = interests
      this._initCategories()
      // 重置为推荐或全部，刷新数据
      this.setData({ page: 1, hasMore: true, trends: [] })
      this.loadTrends(true)
    }
  },

  /**
   * 初始化分类标签 — 根据保存的兴趣动态构建
   * 如果用户有兴趣，在最前面添加"推荐"标签
   */
  _initCategories() {
    const interests = wx.getStorageSync('interests') || []
    this._interests = interests
    
    const baseCategories = [
      { id: 'all', name: '全部' },
      { id: 'tech', name: '科技' },
      { id: 'international', name: '国际' },
      { id: 'finance', name: '财经' },
      { id: 'entertainment', name: '娱乐' },
      { id: 'society', name: '社会' }
    ]
    
    let categories = baseCategories
    let defaultCategory = 'all'
    
    // 如果用户设置了兴趣，在最前面插入"推荐"标签，并设为默认
    if (interests.length > 0) {
      categories = [{ id: 'recommended', name: '推荐' }, ...baseCategories]
      defaultCategory = 'recommended'
    }
    
    this.setData({
      categories,
      activeCategory: defaultCategory
    })
  },

  onPullDownRefresh() {
    this.setData({ refreshing: true })
    // 先触发后端刷新抓取，再加载列表
    api.refreshTrends()
      .then(() => {
        console.log('[WIH] 后端刷新抓取完成')
      })
      .catch(err => {
        console.warn('[WIH] 刷新抓取失败（非致命）:', err.message)
      })
      .then(() => {
        // 无论刷新抓取成败，都重新加载列表
        return this.loadTrends(true)
      })
      .then(() => {
        this.setData({ refreshing: false })
        wx.stopPullDownRefresh()
      })
  },

  onReachBottom() {
    if (!this.data.hasMore || this.data.loading) return
    this.loadTrends(false)
  },

  onCategoryTap(e) {
    const id = e.currentTarget.dataset.id
    if (id === this.data.activeCategory) return
    this.setData({ activeCategory: id, page: 1, hasMore: true, trends: [] })
    this.loadTrends(true)
  },

  // 点击趋势卡片，跳转到详情页
  onTrendTap(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `../detail/detail?id=${id}`
    })
  },

  /**
    * 加载趋势数据
    * @param {boolean} reset - true=重新加载第一页, false=加载下一页
    */
  loadTrends(reset) {
    const page = reset ? 1 : this.data.page
    let category = this.data.activeCategory
    
    // 如果选中"推荐"标签，将其转换为用户的兴趣列表（逗号分隔）
    if (category === 'recommended') {
      const interests = wx.getStorageSync('interests') || []
      category = interests.join(',')
    }

    this.setData({ loading: true, networkError: false })

    return api.getTrends({ page, pageSize: config.pageSize, category })
      .then(res => {
        // 后端返回 { data, total, page, pageSize, hasMore }
        const newTrends = enrichTrends(res.data || [])
        const trends = reset ? newTrends : this.data.trends.concat(newTrends)

        this.setData({
          trends,
          page: page + 1,
          hasMore: res.hasMore,
          loading: false,
          networkError: false
        })
      })
      .catch(err => {
        console.error('[WIH] 加载趋势失败:', err.message)
        this.setData({ loading: false, networkError: true })

        // 如果是首次加载且无数据，显示 mock 降级数据
        if (reset && this.data.trends.length === 0) {
          console.log('[WIH] 使用离线 mock 数据降级显示')
          const mockTrends = createMockTrends()
          this.setData({
            trends: mockTrends,
            hasMore: false
          })
          wx.showToast({ title: '网络不可用，显示示例数据', icon: 'none', duration: 2000 })
        } else {
          wx.showToast({ title: '加载失败，请稍后重试', icon: 'none', duration: 2000 })
        }
      })
  }
})
