// pages/detail/detail.js
// 趋势详情页 — 展示单条趋势的完整信息 + 双语翻译功能

const api = require('../../utils/api')
const { formatTimeAgo, categoryLabelMap } = require('../../utils/util')

Page({
  data: {
    trend: null,         // 趋势详情对象
    loading: true,       // 加载状态
    error: false,        // 是否加载失败
    timeAgo: '',         // 相对时间
    categoryLabel: '',   // 分类中文名
    publishTime: '',     // 格式化的发布时间

    // 翻译相关
    showTranslation: false,   // 是否显示译文
    translating: false,       // 翻译中
    paragraphs: [],           // 双语段落数组 [{en, zh}, ...]
    needsTranslation: false,  // 是否需要翻译（非中文内容）
    hasContent: false         // 是否有全文内容
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

        // 判断是否有全文内容
        const hasContent = !!(trend.content && trend.content.trim().length > 0)

        // 判断是否需要翻译（非中文且有内容）
        const isChinese = this.checkIsChinese(trend.content || trend.title)
        const needsTranslation = hasContent && !isChinese

        // 如果已有翻译，构建双语段落
        let paragraphs = []
        if (trend.translated && trend.contentZh && trend.content) {
          paragraphs = this.buildParagraphs(trend.content, trend.contentZh)
        }

        this.setData({
          trend,
          loading: false,
          error: false,
          timeAgo: formatTimeAgo(trend.publishedAt),
          categoryLabel: categoryLabelMap[trend.category] || trend.category || '综合',
          publishTime,
          hasContent,
          needsTranslation,
          paragraphs,
          showTranslation: trend.translated && paragraphs.length > 0
        })
      })
      .catch(err => {
        console.error('[WIH] 加载趋势详情失败:', err.message)
        this.setData({ loading: false, error: true })
        wx.showToast({ title: '加载失败，请稍后重试', icon: 'none', duration: 2000 })
      })
  },

  /**
   * 检测内容是否为中文
   * @param {string} text
   * @returns {boolean}
   */
  checkIsChinese(text) {
    if (!text) return false
    const chineseChars = text.match(/[\u4e00-\u9fff]/g) || []
    return chineseChars.length / text.length > 0.3
  },

  /**
   * 将原文和译文构建为双语段落
   * @param {string} content - 原文
   * @param {string} contentZh - 译文
   * @returns {Array<{en: string, zh: string}>}
   */
  buildParagraphs(content, contentZh) {
    // 简单按段落分割
    const enParas = this.splitParagraphs(content)
    const zhParas = this.splitParagraphs(contentZh)

    const result = []
    const maxLen = Math.max(enParas.length, zhParas.length)
    for (let i = 0; i < maxLen; i++) {
      result.push({
        en: enParas[i] || '',
        zh: zhParas[i] || ''
      })
    }
    return result
  },

  /**
   * 将 HTML/文本内容分割为段落数组
   * @param {string} html
   * @returns {string[]}
   */
  splitParagraphs(html) {
    if (!html) return []
    // 移除 HTML 标签，按换行分割
    const text = html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')

    return text
      .split(/\n\n+/)
      .map(p => p.trim())
      .filter(p => p.length > 10)
  },

  /**
   * 切换翻译显示
   */
  onToggleTranslation(e) {
    const show = e.detail.value

    // 如果要显示翻译但还没翻译过，先请求翻译
    if (show && this.data.paragraphs.length === 0 && !this.data.trend.translated) {
      this.requestTranslation()
      return
    }

    this.setData({ showTranslation: show })
  },

  /**
   * 请求 AI 翻译
   */
  requestTranslation() {
    if (this.data.translating) return

    const trend = this.data.trend
    if (!trend || !trend.id) return

    this.setData({ translating: true })
    wx.showLoading({ title: '翻译中...' })

    api.translateTrend(trend.id)
      .then(result => {
        wx.hideLoading()

        if (result.needsTranslation === false) {
          // 不需要翻译（中文内容或已翻译）
          this.setData({
            translating: false,
            needsTranslation: false
          })
          wx.showToast({ title: '此内容无需翻译', icon: 'none' })
          return
        }

        // 翻译成功，更新段落和状态
        const paragraphs = result.paragraphs || this.buildParagraphs(result.content, result.contentZh)

        this.setData({
          translating: false,
          showTranslation: true,
          paragraphs,
          trend: {
            ...this.data.trend,
            contentZh: result.contentZh,
            translated: true
          }
        })

        wx.showToast({ title: '翻译完成', icon: 'success' })
      })
      .catch(err => {
        wx.hideLoading()
        console.error('[WIH] 翻译失败:', err.message)
        this.setData({ translating: false })
        wx.showToast({ title: '翻译失败，请重试', icon: 'none' })
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
