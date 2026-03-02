FROM node:20-slim

# 设置时区为 Asia/Shanghai（云托管 FAQ 推荐）
RUN apt-get update && apt-get install -y --no-install-recommends tzdata && \
    ln -sf /usr/share/zoneinfo/Asia/Shanghai /etc/localtime && \
    echo "Asia/Shanghai" > /etc/timezone && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# 设置工作目录
WORKDIR /app

# 复制依赖文件
COPY package*.json ./

# 安装生产依赖
RUN npm ci --only=production

# 复制源代码
COPY src/ ./src/

# 暴露端口 (云托管要求 80，需 root 权限监听)
EXPOSE 80

# 启动服务
CMD ["node", "src/index.js"]
