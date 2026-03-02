// utils/config.js
// 前端配置

module.exports = {
  // 后端 API 地址
  // 本地开发时使用 localhost，部署后替换为云托管地址
  apiBaseUrl: 'http://localhost:3000',

  // 默认分页大小
  pageSize: 20,

  // AI 配置默认值
  defaultAiProvider: 'deepseek',

  // 运行模式：'cloud' = 云托管 (wx.cloud.callContainer), 'local' = 本地开发 (wx.request)
  mode: 'local',  // 部署云托管时改为 'cloud'

  // 云托管环境 ID，部署时填入
  cloudEnv: '',

  // 云托管服务名称
  cloudService: 'wih-server'
}
