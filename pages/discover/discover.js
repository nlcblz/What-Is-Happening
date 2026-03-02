// pages/discover/discover.js
// 发现页 — 分类浏览趋势（双列瀑布流布局）

const api = require('../../utils/api')
const config = require('../../utils/config')
const { enrichTrends } = require('../../utils/util')

// Mock 数据 — 后端不可用时的降级方案
function createMockTrends() {
  const now = new Date()
  return enrichTrends([
    {
      id: 101,
      title: 'Apple Vision Pro Launches in China Market',
      summaryZh: 'Apple Vision Pro 正式在中国大陆发售，首批用户体验空间计算带来的全新交互方式。',
      sourceName: 'Hacker News',
      category: 'tech',
      imageUrl: '',
      publishedAt: new Date(now - 1 * 3600000).toISOString()
    },
    {
      id: 102,
      title: 'G20 Finance Ministers Agree on Digital Tax Framework',
      summaryZh: 'G20 财长会议就全球数字税框架达成共识，预计将影响跨国科技公司的税务结构。',
      sourceName: 'BBC News',
      category: 'finance',
      imageUrl: '',
      publishedAt: new Date(now - 3 * 3600000).toISOString()
    },
    {
      id: 103,
      title: 'Major Earthquake Strikes Southeast Asia Region',
      summaryZh: '东南亚地区发生强烈地震，多国启动应急救援机制，暂无重大伤亡报告。',
      sourceName: 'CNN',
      category: 'international',
      imageUrl: '',
      publishedAt: new Date(now - 4 * 3600000).toISOString()
    },
    {
      id: 104,
      title: 'Top Film Wins Multiple Awards at International Festival',
      summaryZh: '华语电影在国际电影节斩获多项大奖，引发全球影评人热议。',
      sourceName: 'Weibo',
      category: 'entertainment',
      imageUrl: '',
      publishedAt: new Date(now - 6 * 3600000).toISOString()
    },
    {
      id: 105,
      title: 'New Education Policy Reform Announced',
      summaryZh: '教育部发布新一轮教育改革方案，重点推进素质教育和职业技能培养。',
      sourceName: 'Weibo',
      category: 'society',
      imageUrl: '',
      publishedAt: new Date(now - 8 * 3600000).toISOString()
    },
    {
      id: 106,
      title: 'SpaceX Successfully Launches Starship to Orbit',
      summaryZh: 'SpaceX 星舰成功完成轨道飞行测试，标志着人类太空探索进入新阶段。',
      sourceName: 'Hacker News',
      category: 'tech',
      imageUrl: '',
      publishedAt: new Date(now - 10 * 3600000).toISOString()
    }
  ])
}

// 将趋势列表分成左右两列（简易瀑布流）
function splitIntoColumns(trends) {
  const leftCol = []
  const rightCol = []
  trends.forEach((item, index) => {
    if (index % 2 === 0) {
      leftCol.push(item)
    } else {
      rightCol.push(item)
    }
  })
  return { leftCol, rightCol }
}

Page({
  data: {
    trends: [],
    leftCol: [],
    rightCol: [],
    loading: false,
    refreshing: false,
    page: 1,
    hasMore: true,
    networkError: false,
    searchValue: '',
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
    console.log('[WIH] Discover page loaded')
    this.loadTrends(true)
  },

  // 下拉刷新
  onRefresh() {
    this.setData({ refreshing: true })
    this.loadTrends(true)
      .then(() => {
        this.setData({ refreshing: false })
      })
  },

  // 触底加载更多
  onLoadMore() {
    if (!this.data.hasMore || this.data.loading) return
    this.loadTrends(false)
  },

  // 分类切换
  onCategoryTap(e) {
    const id = e.currentTarget.dataset.id
    if (id === this.data.activeCategory) return
    this.setData({
      activeCategory: id,
      page: 1,
      hasMore: true,
      trends: [],
      leftCol: [],
      rightCol: []
    })
    this.loadTrends(true)
  },

  // 搜索输入（占位功能，暂不实现搜索逻辑）
  onSearchInput(e) {
    this.setData({ searchValue: e.detail.value })
  },

  // 搜索确认（占位功能）
  onSearchConfirm() {
    if (!this.data.searchValue.trim()) return
    wx.showToast({ title: '搜索功能即将上线', icon: 'none', duration: 1500 })
  },

  /**
   * 加载趋势数据
   * @param {boolean} reset - true=重新加载第一页, false=加载下一页
   */
  loadTrends(reset) {
    const page = reset ? 1 : this.data.page
    const category = this.data.activeCategory

    this.setData({ loading: true, networkError: false })

    return api.getTrends({ page, pageSize: config.pageSize, category })
      .then(res => {
        const newTrends = enrichTrends(res.data || [])
        const trends = reset ? newTrends : this.data.trends.concat(newTrends)
        const { leftCol, rightCol } = splitIntoColumns(trends)

        this.setData({
          trends,
          leftCol,
          rightCol,
          page: page + 1,
          hasMore: res.hasMore,
          loading: false,
          networkError: false
        })
      })
      .catch(err => {
        console.error('[WIH] 发现页加载趋势失败:', err.message)
        this.setData({ loading: false, networkError: true })

        // 首次加载且无数据时，显示 mock 降级数据
        if (reset && this.data.trends.length === 0) {
          console.log('[WIH] 使用离线 mock 数据降级显示')
          var mockTrends = createMockTrends()
          // 如果选了分类，过滤 mock 数据
          if (category !== 'all') {
            mockTrends = mockTrends.filter(function(item) {
              return item.category === category
            })
          }
          var columns = splitIntoColumns(mockTrends)
          this.setData({
            trends: mockTrends,
            leftCol: columns.leftCol,
            rightCol: columns.rightCol,
            hasMore: false
          })
          wx.showToast({ title: '网络不可用，显示示例数据', icon: 'none', duration: 2000 })
        } else {
          wx.showToast({ title: '加载失败，请稍后重试', icon: 'none', duration: 2000 })
        }
      })
  }
})
