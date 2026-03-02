// server/src/services/summarize.js
// AI 摘要服务 — 支持 DeepSeek 和 OpenAI
const OpenAI = require('openai')
const config = require('../config')

// 创建 AI 客户端
function createClient(provider, userApiKey) {
  if (provider === 'openai') {
    return new OpenAI({
      apiKey: userApiKey || config.openai.apiKey,
      baseURL: config.openai.baseUrl
    })
  }
  // 默认使用 DeepSeek
  return new OpenAI({
    apiKey: userApiKey || config.deepseek.apiKey,
    baseURL: config.deepseek.baseUrl
  })
}

// 获取模型名称
function getModel(provider) {
  if (provider === 'openai') {
    return 'gpt-4o-mini'
  }
  return 'deepseek-chat'
}

// 生成单条摘要
async function summarizeArticle(article, options = {}) {
  const provider = options.provider || config.defaultAiProvider
  const userApiKey = options.apiKey || ''
  const client = createClient(provider, userApiKey)
  const model = getModel(provider)

  const prompt = `你是一个新闻摘要助手。请为以下新闻文章生成一个简洁的中文摘要（100字以内）和一个英文摘要（50词以内）。

标题: ${article.title}
来源: ${article.sourceName || '未知'}
内容: ${article.content || article.description || '无详细内容'}
链接: ${article.url || ''}

请严格按以下 JSON 格式返回，不要包含其他内容:
{
  "summaryZh": "中文摘要内容",
  "summary": "English summary content"
}`

  try {
    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: '你是一个专业的新闻摘要生成器。始终返回有效的 JSON 格式。' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 300
    })

    const text = response.choices[0].message.content.trim()
    // 尝试解析 JSON
    const parsed = JSON.parse(text)
    return {
      summary: parsed.summary || '',
      summaryZh: parsed.summaryZh || ''
    }
  } catch (err) {
    console.error(`[WIH] AI 摘要失败 (${provider}):`, err.message)
    // 降级处理：返回截断的标题作为摘要
    return {
      summary: article.title || '',
      summaryZh: article.title || ''
    }
  }
}

// 批量生成摘要
async function summarizeBatch(articles, options = {}) {
  const results = []
  for (const article of articles) {
    const result = await summarizeArticle(article, options)
    results.push({
      ...article,
      ...result
    })
    // 简单限流：每次请求间隔 500ms
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  return results
}

module.exports = { summarizeArticle, summarizeBatch }
