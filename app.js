// app.js
const config = require('./utils/config')

App({
  onLaunch() {
    console.log('[WIH] App launched')

    // 初始化云开发环境（云托管模式下需要）
    if (config.mode === 'cloud' && wx.cloud) {
      wx.cloud.init({
        env: config.cloudEnv,
        traceUser: true
      })
      console.log('[WIH] 云开发环境已初始化')
    }
  },
  globalData: {
    userInfo: null
  }
})
