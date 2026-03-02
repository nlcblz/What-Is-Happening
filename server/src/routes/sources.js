const express = require('express')
const sourceModel = require('../models/source')

const router = express.Router()

// 允许的数据源类型
const VALID_TYPES = ['rss', 'html', 'headless']

// 验证必填字段和数据格式
function validateSourceData(data, isUpdate = false) {
  const errors = []

  if (!isUpdate) {
    // 新增时，以下字段必须存在
    if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
      errors.push('name 必须是非空字符串')
    }
    if (!data.url || typeof data.url !== 'string' || data.url.trim() === '') {
      errors.push('url 必须是非空字符串')
    }
    if (!data.type || !VALID_TYPES.includes(data.type)) {
      errors.push(`type 必须是以下之一: ${VALID_TYPES.join(', ')}`)
    }
    if (!data.category || typeof data.category !== 'string' || data.category.trim() === '') {
      errors.push('category 必须是非空字符串')
    }
  } else {
    // 更新时，仅在提供时验证
    if (data.name !== undefined) {
      if (typeof data.name !== 'string' || data.name.trim() === '') {
        errors.push('name 必须是非空字符串')
      }
    }
    if (data.url !== undefined) {
      if (typeof data.url !== 'string' || data.url.trim() === '') {
        errors.push('url 必须是非空字符串')
      }
    }
    if (data.type !== undefined) {
      if (!VALID_TYPES.includes(data.type)) {
        errors.push(`type 必须是以下之一: ${VALID_TYPES.join(', ')}`)
      }
    }
    if (data.category !== undefined) {
      if (typeof data.category !== 'string' || data.category.trim() === '') {
        errors.push('category 必须是非空字符串')
      }
    }
  }

  // 可选字段验证
  if (data.enabled !== undefined && typeof data.enabled !== 'boolean') {
    errors.push('enabled 必须是布尔值')
  }
  if (data.config !== undefined && typeof data.config !== 'object') {
    errors.push('config 必须是对象')
  }

  return errors
}

// 获取所有数据源
router.get('/', async (req, res, next) => {
  try {
    const sources = await sourceModel.getAll()
    res.json({
      sources,
      total: sources.length
    })
  } catch (err) {
    next(err)
  }
})

// 获取分类列表
router.get('/categories', async (req, res, next) => {
  try {
    const sources = await sourceModel.getAll()
    const categories = [...new Set(sources.map(s => s.category))].sort()
    res.json({
      categories,
      total: categories.length
    })
  } catch (err) {
    next(err)
  }
})

// 新增数据源
router.post('/', async (req, res, next) => {
  try {
    const { name, url, type, category, enabled, config } = req.body

    // 验证必填字段
    const errors = validateSourceData(req.body)
    if (errors.length > 0) {
      return res.status(400).json({
        error: '数据验证失败',
        details: errors
      })
    }

    // 创建新数据源
    const newSource = await sourceModel.add({
      name,
      url,
      type,
      category,
      enabled,
      config
    })

    res.status(201).json({
      message: '数据源创建成功',
      source: newSource
    })
  } catch (err) {
    next(err)
  }
})

// 更新数据源
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    const updateData = req.body

    // 检查数据源是否存在
    const source = await sourceModel.getById(id)
    if (!source) {
      return res.status(404).json({
        error: '数据源不存在',
        id
      })
    }

    // 验证更新数据
    const errors = validateSourceData(updateData, true)
    if (errors.length > 0) {
      return res.status(400).json({
        error: '数据验证失败',
        details: errors
      })
    }

    // 执行更新
    const updated = await sourceModel.update(id, updateData)

    res.json({
      message: '数据源更新成功',
      source: updated
    })
  } catch (err) {
    next(err)
  }
})

// 删除数据源
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params

    // 检查数据源是否存在
    const source = await sourceModel.getById(id)
    if (!source) {
      return res.status(404).json({
        error: '数据源不存在',
        id
      })
    }

    // 执行删除
    await sourceModel.remove(id)

    res.status(204).send()
  } catch (err) {
    next(err)
  }
})

module.exports = router
