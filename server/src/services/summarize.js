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

// ========== 翻译功能 ==========
// 检测内容是否为中文（超过 30% 中文字符即认为是中文）
function isChinese(text) {
  if (!text) return false
  const chineseChars = text.match(/[\u4e00-\u9fff]/g) || []
  return chineseChars.length / text.length > 0.3
}

// 将 HTML 内容转换为纯文本段落数组
function htmlToParas(html) {
  if (!html) return []
  // 移除 HTML 标签，按换行或段落分割
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
    .filter(p => p.length > 10) // 过滤过短段落
}

// 段落级翻译（英 → 中）
async function translateContent(content, options = {}) {
  if (!content || isChinese(content)) {
    // 中文内容不翻译
    return { contentZh: content, paragraphs: [] }
  }

  const provider = options.provider || config.defaultAiProvider
  const userApiKey = options.apiKey || ''
  const client = createClient(provider, userApiKey)
  const model = getModel(provider)

  const paras = htmlToParas(content)
  if (paras.length === 0) {
    return { contentZh: '', paragraphs: [] }
  }

  // 构建翻译 prompt（批量翻译多个段落）
  const prompt = `你是一个专业翻译。请将以下英文段落逐段翻译成中文，保持段落对应关系。
每个段落用 --- 分隔。

${paras.map((p, i) => `[段落${i + 1}]\n${p}`).join('\n\n')}

请严格按以下 JSON 格式返回，translations 数组长度必须等于原段落数量:
{
  "translations": ["第一段中文翻译", "第二段中文翻译", ...]
}`

  try {
    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: '你是专业翻译，只输出 JSON，不添加任何解释。' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2,
      max_tokens: 4000
    })

    const text = response.choices[0].message.content.trim()
    const parsed = JSON.parse(text)
    const translations = parsed.translations || []

    // 组装双语段落
    const paragraphs = paras.map((en, i) => ({
      en,
      zh: translations[i] || ''
    }))

    // 合并中文全文
    const contentZh = translations.join('\n\n')

    return { contentZh, paragraphs }
  } catch (err) {
    console.error(`[WIH] AI 翻译失败 (${provider}):`, err.message)
    return { contentZh: '', paragraphs: [] }
  }
}

module.exports = { summarizeArticle, summarizeBatch, translateContent, isChinese }
