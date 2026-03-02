// server/src/services/scraper.js
// 爬虫模块 — RSS + HTML 抓取
const RssParser = require('rss-parser')
const axios = require('axios')
const cheerio = require('cheerio')
const schedule = require('node-schedule')
const sourceModel = require('../models/source')
const trendModel = require('../models/trend')

const rssParser = new RssParser({
  timeout: 15000,
  headers: {
    'User-Agent': 'WIH-Bot/1.0 (What Is Happening Trend Aggregator)'
  }
})

// ========== RSS 抓取 ==========
async function scrapeRSS(source) {
  try {
    console.log(`[WIH] 抓取 RSS: ${source.name} (${source.url})`)
    const feed = await rssParser.parseURL(source.url)
    const maxItems = (source.config && source.config.maxItems) || 20

    const items = feed.items.slice(0, maxItems).map(item => ({
      title: item.title || '',
      url: item.link || '',
      description: item.contentSnippet || item.content || '',
      sourceId: source.id,
      sourceName: source.name,
      category: source.category,
      publishedAt: item.pubDate || item.isoDate || new Date().toISOString(),
      imageUrl: extractImageFromRSS(item)
    }))

    console.log(`[WIH] ${source.name}: 获取到 ${items.length} 条`)
    return items
  } catch (err) {
    console.error(`[WIH] RSS 抓取失败 (${source.name}):`, err.message)
    return []
  }
}

// 从 RSS item 中提取图片 URL
function extractImageFromRSS(item) {
  // 尝试从 enclosure 获取
  if (item.enclosure && item.enclosure.url) {
    return item.enclosure.url
  }
  // 尝试从 media:content 获取
  if (item['media:content'] && item['media:content']['$'] && item['media:content']['$'].url) {
    return item['media:content']['$'].url
  }
  // 尝试从 content 中解析 img 标签
  if (item.content) {
    const match = item.content.match(/<img[^>]+src="([^"]+)"/)
    if (match) return match[1]
  }
  return ''
}

// ========== HTML 抓取 (通用) ==========
async function scrapeHTML(source) {
  try {
    console.log(`[WIH] 抓取 HTML: ${source.name} (${source.url})`)
    const response = await axios.get(source.url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })

    const $ = cheerio.load(response.data)
    const maxItems = (source.config && source.config.maxItems) || 20
    const selector = (source.config && source.config.selector) || 'a'
    const items = []

    $(selector).slice(0, maxItems).each((i, el) => {
      const title = $(el).text().trim()
      const url = $(el).attr('href') || ''
      if (title && title.length > 5) {
        items.push({
          title,
          url: url.startsWith('http') ? url : `${source.url}${url}`,
          description: '',
          sourceId: source.id,
          sourceName: source.name,
          category: source.category,
          publishedAt: new Date().toISOString(),
          imageUrl: ''
        })
      }
    })

    console.log(`[WIH] ${source.name}: 获取到 ${items.length} 条`)
    return items
  } catch (err) {
    console.error(`[WIH] HTML 抓取失败 (${source.name}):`, err.message)
    return []
  }
}

// ========== 调度器 ==========
// 根据数据源类型分发抓取
async function scrapeSource(source) {
  switch (source.type) {
    case 'rss':
      return scrapeRSS(source)
    case 'html':
      return scrapeHTML(source)
    default:
      console.warn(`[WIH] 未知数据源类型: ${source.type}`)
      return []
  }
}

// 抓取所有启用的数据源
async function scrapeAll() {
  const sources = sourceModel.getEnabled()
  console.log(`[WIH] 开始抓取 ${sources.length} 个数据源...`)

  let totalAdded = 0
  for (const source of sources) {
    try {
      const items = await scrapeSource(source)
      const added = trendModel.addBatch(items)
      totalAdded += added.length
      sourceModel.updateLastScraped(source.id)
    } catch (err) {
      console.error(`[WIH] 抓取失败 (${source.name}):`, err.message)
    }
  }

  console.log(`[WIH] 抓取完成，新增 ${totalAdded} 条趋势`)
  return totalAdded
}

// 启动定时抓取任务
let scheduledJob = null

function startScheduler(cronExpression = '*/30 * * * *') {
  // 默认每 30 分钟抓取一次
  scheduledJob = schedule.scheduleJob(cronExpression, async () => {
    console.log(`[WIH] 定时抓取任务触发: ${new Date().toISOString()}`)
    await scrapeAll()
  })
  console.log(`[WIH] 定时抓取已启动 (${cronExpression})`)
}

function stopScheduler() {
  if (scheduledJob) {
    scheduledJob.cancel()
    scheduledJob = null
    console.log('[WIH] 定时抓取已停止')
  }
}

module.exports = { scrapeRSS, scrapeHTML, scrapeSource, scrapeAll, startScheduler, stopScheduler }
