# 🚀 快速部署指南

5 分钟完成微信云托管部署。详细说明请参考 [DEPLOYMENT.md](./DEPLOYMENT.md)。

---

## 步骤 1: 推送代码到 GitHub

```bash
git add .
git commit -m "Add cloud run deployment config"
git push origin main
```

✅ 确认仓库地址：https://github.com/nlcblz/What-Is-Happening.git

---

## 步骤 2: 登录云托管控制台

访问：https://cloud.weixin.qq.com/cloudrun

使用微信小程序管理员账号登录。

---

## 步骤 3: 创建服务

**控制台 → 新建服务**

填写以下信息：

| 配置项 | 值 |
|--------|-----|
| 服务名称 | `wih-backend` |
| 代码来源 | GitHub |
| 仓库地址 | `nlcblz/What-Is-Happening` |
| 分支 | `main` |
| 目标目录 | `server` ⚠️ 重要 |
| Dockerfile 路径 | `Dockerfile` |
| 容器端口 | `80` |

---

## 步骤 4: 配置环境变量

**服务设置 → 环境变量 → 添加**

必填变量：

```bash
NODE_ENV=production
PORT=80
DEEPSEEK_API_KEY=sk-your-api-key-here
DEFAULT_AI_PROVIDER=deepseek
```

⚠️ **注意**: `TCB_ENV`（云数据库环境 ID）由云托管自动注入，无需手动配置。

---

## 步骤 5: 首次部署

**版本管理 → 新建版本 → 构建并发布**

等待 3-5 分钟，查看构建日志。

---

## 步骤 6: 验证部署

访问健康检查端点：

```
https://你的服务ID.service.tcloudbase.com/health
```

预期响应：

```json
{
  "status": "ok",
  "ready": true,
  "timestamp": "2026-03-02T10:30:00.000Z"
}
```

---

## 步骤 7: 测试 API

```bash
# 获取数据源列表
curl https://你的服务ID.service.tcloudbase.com/api/sources

# 获取趋势列表
curl https://你的服务ID.service.tcloudbase.com/api/trends
```

---

## 步骤 8: 启用自动部署（可选）

**服务设置 → 流水线 → 推送触发 → 启用**

之后每次推送到 `main` 分支都会自动触发部署。

---

## ✅ 部署完成！

### 下一步：

1. **绑定自定义域名**（可选）
   - 服务设置 → 域名管理

2. **配置监控告警**
   - 监控告警 → 告警策略

3. **更新小程序 API 地址**
   - 在小程序代码中更新后端 API 地址
   - 在小程序后台配置服务器域名白名单

---

## 📊 资源配置说明

当前配置（可在控制台调整）：

- **CPU**: 0.5 核
- **内存**: 1 GB
- **最小副本数**: 0（无流量时自动缩容到 0，节省成本）
- **最大副本数**: 50

### 成本估算

| 场景 | 月成本 |
|------|--------|
| 无流量（自动缩容） | ¥0 |
| 平均 10% 运行时间 | ¥3-5 |
| 全天候运行 | ¥30-40 |

---

## 🔧 常见问题

### Q: 构建失败，提示找不到 Dockerfile？

**A**: 检查"目标目录"是否填写为 `server`。

### Q: 健康检查失败？

**A**: 
1. 确认环境变量 `PORT=80` 已配置
2. 查看实时日志，检查服务是否正常启动
3. 等待初始化完成（约 10-30 秒）

### Q: API 返回 503 错误？

**A**: 数据库初始化中，查看日志等待初始化完成。如果长时间未完成，检查云数据库权限设置。

### Q: 如何查看日志？

**A**: 版本管理 → 版本详情 → 实时日志

---

## 📚 相关文档

- [完整部署指南](./DEPLOYMENT.md) - 详细配置说明
- [官方文档](https://developers.weixin.qq.com/miniprogram/dev/wxcloudservice/) - 微信云托管官方文档
- [控制台](https://cloud.weixin.qq.com/cloudrun) - 云托管管理控制台

---

**需要帮助？**

- 官方文档：https://developers.weixin.qq.com/miniprogram/dev/wxcloudservice/
- 社区论坛：微信开放社区 - 云托管板块
