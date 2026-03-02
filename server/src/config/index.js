require('dotenv').config();

module.exports = {
  port: process.env.PORT || 80,
  nodeEnv: process.env.NODE_ENV || 'development',
  tcbEnv: process.env.TCB_ENV || '',
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
