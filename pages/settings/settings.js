// pages/settings/settings.js
const api = require('../../utils/api')

// 兴趣分类配置
const interestCategories = [
  { id: 'tech', name: '科技' },
  { id: 'international', name: '国际' },
  { id: 'finance', name: '财经' },
  { id: 'entertainment', name: '娱乐' },
  { id: 'society', name: '社会' }
]

Page({
  data: {
    apiKey: '',
    aiProvider: 'deepseek',
    interestCategories: interestCategories,
    selectedInterests: [],
    isAdmin: false
  },
  onLoad() {
    console.log('[WIH] Settings page loaded')
    // 从本地存储读取设置
    const apiKey = wx.getStorageSync('apiKey') || ''
    const aiProvider = wx.getStorageSync('aiProvider') || 'deepseek'
    const selectedInterests = wx.getStorageSync('interests') || []
    this.setData({ apiKey, aiProvider, selectedInterests })
    // 检测管理员身份
    this.checkAdminStatus()
  },
  onShow() {
    // 每次显示时重新检测管理员身份
    this.checkAdminStatus()
  },
  // 检测是否为管理员
  async checkAdminStatus() {
    try {
      const res = await api.checkAdmin()
      this.setData({ isAdmin: res.isAdmin })
    } catch (err) {
      console.error('[WIH] 检测管理员身份失败:', err)
      this.setData({ isAdmin: false })
    }
  },
  // 跳转到官方公告
  goToAnnouncements() {
    wx.navigateTo({ url: '/pages/announcements/announcements' })
  },
  // 跳转到内容管理（仅管理员）
  goToAdmin() {
    if (!this.data.isAdmin) {
      wx.showToast({ title: '无权限', icon: 'error' })
      return
    }
    wx.navigateTo({ url: '/pages/admin/admin' })
  },
  onApiKeyInput(e) {
    this.setData({ apiKey: e.detail.value })
  },
  onProviderChange(e) {
    const providers = ['deepseek', 'openai']
    this.setData({ aiProvider: providers[e.detail.value] })
  },
  // 切换兴趣分类选中状态
  onInterestTap(e) {
    const id = e.currentTarget.dataset.id
    const selected = this.data.selectedInterests.slice()
    const index = selected.indexOf(id)
    if (index > -1) {
      selected.splice(index, 1)
    } else {
      selected.push(id)
    }
    this.setData({ selectedInterests: selected })
  },
  // 保存所有设置（AI 配置 + 兴趣）
  onSaveSettings() {
    wx.setStorageSync('apiKey', this.data.apiKey)
    wx.setStorageSync('aiProvider', this.data.aiProvider)
    wx.setStorageSync('interests', this.data.selectedInterests)
    wx.showToast({ title: '设置已保存', icon: 'success' })
  }
})
