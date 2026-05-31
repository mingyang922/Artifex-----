FROM node:22-alpine

WORKDIR /app

# 安装构建工具（better-sqlite3 需要）
RUN apk add --no-cache python3 make g++

# 复制依赖文件
COPY package.json package-lock.json ./

# 安装依赖
RUN npm ci --omit=dev

# 复制源码
COPY backend/ ./backend/
COPY config/ ./config/
COPY js/ ./js/
COPY styles/ ./styles/
COPY modules/ ./modules/
COPY docs/ ./docs/
COPY *.html ./

# 创建数据目录
RUN mkdir -p backend/data

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

# 启动
CMD ["node", "backend/proxy.js"]
