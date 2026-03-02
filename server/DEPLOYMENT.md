# 微信云托管部署指南

本文档详细说明如何将本后端服务部署到微信云托管（WeChat Cloud Run）。

---

## 前提条件

- ✅ 代码已推送到 GitHub 公开仓库：`https://github.com/nlcblz/What-Is-Happening.git`
- ✅ 后端代码位于 `server/` 子目录
- ✅ 已创建 `Dockerfile` 和 `container.config.json`
- ✅ 微信小程序已注册并获得 AppID

---

## 一、云托管服务配置

### 1. 登录云托管控制台

访问：https://cloud.weixin.qq.com/cloudrun

使用您的微信小程序管理员账号登录。

### 2. 创建服务

**服务设置 → 创建服务**

- **服务名称**: `wih-backend`（或任意名称）
- **代码来源**: GitHub
- **仓库地址**: `nlcblz/What-Is-Happening`
- **分支**: `main`
- **目标目录**: `server`（重要！因为是 monorepo 结构）
- **Dockerfile 路径**: `Dockerfile`（相对于目标目录）
- **容器端口**: `80`

### 3. 配置流水线（Pipeline）

**服务设置 → 流水线**

- **分支**: `main`
- **目标目录**: `server`
- **启用推送触发**: ✅（可选，首次建议手动部署后再启用）

启用推送触发后，GitHub 仓库会自动添加 Webhook，每次推送到 main 分支时自动触发部署。

---

## 二、环境变量配置

### 云托管控制台配置

**服务设置 → 环境变量**

需要配置以下环境变量：

| 变量名 | 说明 | 示例值 | 必填 |
|--------|------|--------|------|
| `NODE_ENV` | 运行环境 | `production` | ✅ |
| `PORT` | 服务端口 | `80` | ✅ |
| `DEEPSEEK_API_KEY` | DeepSeek API 密钥 | `sk-xxx` | ✅ |
| `DEFAULT_AI_PROVIDER` | 默认 AI 提供商 | `deepseek` | ✅ |
| `OPENAI_API_KEY` | OpenAI API 密钥 | `sk-xxx` | ❌ |
| `TCB_ENV` | 云数据库环境 ID | 云托管自动注入 | ❌ |

**注意**:
- `TCB_ENV` 由云托管自动注入，无需手动配置
- `PORT` 必须为 `80`，这是云托管的标准端口
- 环境变量修改后会自动创建新版本

---

## 三、资源配置

### CPU & 内存规格

根据 `container.config.json` 配置：

- **CPU**: `0.5` 核
- **内存**: `1 GB`
- **最小副本数**: `0`（允许缩容到 0，节省成本）
- **最大副本数**: `50`

### CPU/内存配比规则

| CPU (核) | 内存 (GB) |
|----------|-----------|
| 0.25 | 0.5 |
| 0.5 | 1 |
| 1 | 2 |
| 2 | 4 |

**成本优化建议**:
- 初期使用 `0.5核/1GB` 配置，根据实际流量调整
- `minReplicas: 0` 允许无流量时缩容到 0，完全免费
- 冷启动时间约 3-5 秒（首次请求会稍慢）

---

## 四、部署流程

### 方式一：手动部署（推荐首次使用）

1. **云托管控制台 → 版本管理 → 新建版本**
2. 选择代码源：**GitHub**
3. 填写配置：
   - 仓库：`nlcblz/What-Is-Happening`
   - 分支：`main`
   - 目标目录：`server`
4. 确认配置：
   - Dockerfile 路径：`Dockerfile`
   - 容器端口：`80`
5. 点击**构建并发布**

### 方式二：推送触发自动部署

1. 确保流水线已配置（见上文）
2. 启用**推送触发**
3. 每次推送代码到 `main` 分支时自动部署

---

## 五、灰度发布策略

首次部署建议使用灰度发布，逐步放量：

### 配置灰度规则

**版本管理 → 选择版本 → 灰度发布**

#### 方案 1: 按流量百分比
- **初始流量**: 10%（新版本）
- **观察 10 分钟，无异常后调整至 50%**
- **再观察 10 分钟，无异常后调整至 100%**

#### 方案 2: 按 OpenID 白名单
- 添加测试用户的 OpenID
- 测试用户先访问新版本，验证功能
- 验证通过后全量发布

#### 方案 3: 按 URL 参数
- 访问 `https://your-service.com/api?canary=true` 路由到新版本
- 适用于内部测试

---

## 六、健康检查

服务已配置健康检查端点：

- **路径**: `/health`
- **端口**: `80`
- **协议**: `HTTP`
- **检查间隔**: 10 秒
- **超时时间**: 3 秒
- **失败阈值**: 3 次

健康检查配置在 `container.config.json` 中：

```json
"healthCheck": {
  "type": "http",
  "path": "/health",
  "port": 80,
  "initialDelaySeconds": 10,
  "periodSeconds": 10,
  "timeoutSeconds": 3,
  "successThreshold": 1,
  "failureThreshold": 3
}
```

---

## 七、数据库配置

### 云数据库初始化

1. **云托管控制台 → 数据库**
2. 创建云数据库（如果未创建）
3. 环境 ID 会自动注入到 `TCB_ENV` 环境变量
4. 首次运行时会自动：
   - 创建 `sources` 集合（数据源配置）
   - 创建 `trends` 集合（趋势热点数据）
   - 导入初始数据源（`src/data/seed-sources.json`）

### 数据库权限

确保云托管服务具有数据库读写权限：

**云数据库 → 数据库设置 → 权限管理**

选择：**仅云托管可读写**

---

## 八、验证部署

### 1. 检查服务状态

**版本管理 → 查看日志**

正常启动日志示例：
```
[WIH Server] 服务启动于端口 80
[WIH Server] 环境: production
[WIH Server] 存储: 云数据库
[WIH Server] 初始化完成,服务就绪
[WIH] 首次抓取完成,新增 12 条
```

### 2. 测试健康检查

访问服务域名：
```
https://your-service-id.service.tcloudbase.com/health
```

预期响应：
```json
{
  "status": "ok",
  "ready": true,
  "timestamp": "2026-03-02T10:30:00.000Z"
}
```

### 3. 测试 API 接口

```bash
# 获取数据源列表
curl https://your-service-id.service.tcloudbase.com/api/sources

# 获取趋势列表
curl https://your-service-id.service.tcloudbase.com/api/trends
```

---

## 九、常见问题

### 1. 构建失败：找不到 Dockerfile

**原因**: 目标目录配置错误

**解决**: 确保目标目录为 `server`，Dockerfile 路径为 `Dockerfile`（相对路径）

### 2. 容器启动失败：端口未监听

**原因**: 应用未监听 80 端口

**解决**: 确保环境变量 `PORT=80`，检查 `src/config/index.js` 配置

### 3. 健康检查失败

**原因**: `/health` 路径返回非 200 状态码

**解决**: 检查 `src/routes/health.js` 实现，确保返回正确的响应

### 4. 数据库连接失败

**原因**: `TCB_ENV` 环境变量未配置

**解决**: 
- 云托管会自动注入此变量，无需手动配置
- 如果仍失败，检查云数据库权限设置

### 5. API 返回 503 Service Unavailable

**原因**: 数据库初始化未完成

**解决**: 
- 查看日志，等待初始化完成（约 10-30 秒）
- 如果长时间未完成，检查数据库连接

### 6. 冷启动慢

**原因**: `minReplicas: 0` 导致需要从 0 启动容器

**解决**: 
- 接受 3-5 秒的冷启动时间（成本优化）
- 或设置 `minReplicas: 1` 保持至少 1 个实例运行（会产生持续费用）

---

## 十、监控与日志

### 日志查看

**版本管理 → 版本详情 → 实时日志**

日志类型：
- **应用日志**: `console.log` / `console.error` 输出
- **访问日志**: HTTP 请求记录
- **系统日志**: 容器启动/停止事件

### 日志配置

`container.config.json` 中已配置：

```json
"logConfig": {
  "logType": "json",
  "logPath": "/app/logs"
}
```

**注意**: 日志路径不能与 Dockerfile 的 VOLUME 重叠。

### 监控指标

**监控告警 → 服务监控**

关键指标：
- **CPU 使用率**: 建议 < 70%
- **内存使用率**: 建议 < 80%
- **请求延迟**: 建议 P95 < 1s
- **错误率**: 建议 < 1%

---

## 十一、成本估算

### 计费规则

- **CPU**: ¥0.055 元/核/小时
- **内存**: ¥0.032 元/GB/小时
- **流量**: ¥0.8 元/GB（出站流量）

### 示例成本（0.5核/1GB）

| 场景 | 月成本估算 |
|------|-----------|
| 全天运行（minReplicas=1） | ¥30-40/月 |
| 平均 10% 时间运行（minReplicas=0） | ¥3-5/月 |
| 无流量（自动缩容到 0） | ¥0/月 |

**建议**:
- 开发/测试环境：使用 `minReplicas: 0` 节省成本
- 生产环境：根据流量选择合适配置

---

## 十二、下一步

部署成功后：

1. **绑定自定义域名**（可选）
   - 云托管控制台 → 服务设置 → 域名管理
   - 添加域名并配置 CNAME 记录

2. **配置 HTTPS 证书**（可选）
   - 云托管默认提供 HTTPS 支持
   - 自定义域名需上传证书

3. **设置告警策略**
   - 监控告警 → 告警策略
   - 配置 CPU/内存/错误率告警

4. **微信小程序接入**
   - 更新小程序代码中的 API 地址
   - 在小程序后台配置服务器域名白名单

---

## 附录：配置文件说明

### container.config.json 完整示例

```json
{
  "containerPort": 80,
  "dockerfilePath": "Dockerfile",
  "buildDir": ".",
  "envVariables": {},
  "minReplicas": 0,
  "maxReplicas": 50,
  "cpu": 0.5,
  "mem": 1,
  "logConfig": {
    "logType": "json",
    "logPath": "/app/logs"
  },
  "healthCheck": {
    "type": "http",
    "path": "/health",
    "port": 80,
    "initialDelaySeconds": 10,
    "periodSeconds": 10,
    "timeoutSeconds": 3,
    "successThreshold": 1,
    "failureThreshold": 3
  }
}
```

### 字段说明

| 字段 | 说明 | 默认值 |
|------|------|--------|
| `containerPort` | 容器监听端口 | 无，必填 |
| `dockerfilePath` | Dockerfile 相对路径 | `Dockerfile` |
| `buildDir` | 构建上下文目录 | `.` |
| `minReplicas` | 最小副本数 | 0 |
| `maxReplicas` | 最大副本数 | 50 |
| `cpu` | CPU 配额（核） | 0.5 |
| `mem` | 内存配额（GB） | 1 |

---

## 技术支持

- **官方文档**: https://developers.weixin.qq.com/miniprogram/dev/wxcloudservice/
- **控制台**: https://cloud.weixin.qq.com/cloudrun
- **社区**: 微信开放社区 - 云托管板块

---

**部署清单（Checklist）**

- [ ] 确认代码已推送到 GitHub main 分支
- [ ] 确认 `server/Dockerfile` 存在且暴露 80 端口
- [ ] 确认 `server/container.config.json` 已创建
- [ ] 云托管控制台创建服务并配置 GitHub 仓库
- [ ] 配置环境变量（NODE_ENV, PORT, DEEPSEEK_API_KEY）
- [ ] 首次手动部署并验证健康检查
- [ ] 测试 API 接口是否正常响应
- [ ] 启用推送触发实现自动部署
- [ ] 配置监控告警策略
- [ ] 更新小程序代码中的 API 地址

部署完成！🎉
