require('dotenv').config();

module.exports = {
  port: process.env.PORT || 80,
  nodeEnv: process.env.NODE_ENV || 'development',

  // MySQL 数据库配置（云托管内网地址）
  mysql: {
    host: process.env.MYSQL_HOST || '10.28.104.219',
    port: parseInt(process.env.MYSQL_PORT || '3306', 10),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'wih'
  },

  // AI 摘要服务配置
  defaultAiProvider: process.env.DEFAULT_AI_PROVIDER || 'deepseek',
  deepseek: {
    apiKey: process.env.DEEPSEEK_API_KEY || '',
    baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1'
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
  }
};
