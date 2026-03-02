FROM node:20-slim

# 设置工作目录
WORKDIR /app

# 复制依赖文件
COPY package*.json ./

# 安装生产依赖
RUN npm ci --only=production

# 复制源代码
COPY src/ ./src/

# 非 root 用户运行
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
USER appuser

# 暴露端口 (云托管要求 80)
EXPOSE 80

# 启动服务
CMD ["node", "src/index.js"]
