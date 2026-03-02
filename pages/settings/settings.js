// pages/settings/settings.js
Page({
  data: {
    apiKey: '',
    aiProvider: 'deepseek'
  },
  onLoad() {
    console.log('[WIH] Settings page loaded')
    // 从本地存储读取设置
    const apiKey = wx.getStorageSync('apiKey') || ''
    const aiProvider = wx.getStorageSync('aiProvider') || 'deepseek'
    this.setData({ apiKey, aiProvider })
  },
  onApiKeyInput(e) {
    this.setData({ apiKey: e.detail.value })
  },
  onProviderChange(e) {
    const providers = ['deepseek', 'openai']
    this.setData({ aiProvider: providers[e.detail.value] })
  },
  onSaveSettings() {
    wx.setStorageSync('apiKey', this.data.apiKey)
    wx.setStorageSync('aiProvider', this.data.aiProvider)
    wx.showToast({ title: '设置已保存', icon: 'success' })
  }
})
