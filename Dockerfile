# ============================================================
# Stage 1: deps - Install production dependencies only
# ============================================================
FROM node:22.23.2-alpine AS deps

WORKDIR /app

ARG NPM_REGISTRY=https://registry.npmmirror.com
ARG ALPINE_MIRROR=https://mirrors.tencent.com/alpine
ARG NODE_DIST_URL=https://npmmirror.com/mirrors/node

# better-sqlite3 needs python3, make, g++ to compile native addons
RUN sed -i "s#https://dl-cdn.alpinelinux.org/alpine#$ALPINE_MIRROR#g" /etc/apk/repositories \
    && apk add --no-cache python3 py3-setuptools make g++

COPY package.json package-lock.json ./
COPY scripts/check-node-version.js scripts/postinstall-native.js ./scripts/

RUN npm config set registry "$NPM_REGISTRY" \
    && npm config set replace-registry-host always \
    && npm_config_disturl="$NODE_DIST_URL" npm ci --omit=dev --fetch-retries=5 --fetch-retry-mintimeout=10000 --fetch-retry-maxtimeout=120000

# ============================================================
# Stage 2: build - Build frontend assets with Vite
# ============================================================
FROM node:22.23.2-alpine AS build

WORKDIR /app

ARG NPM_REGISTRY=https://registry.npmmirror.com
ARG ALPINE_MIRROR=https://mirrors.tencent.com/alpine
ARG NODE_DIST_URL=https://npmmirror.com/mirrors/node

RUN sed -i "s#https://dl-cdn.alpinelinux.org/alpine#$ALPINE_MIRROR#g" /etc/apk/repositories \
    && apk add --no-cache python3 py3-setuptools make g++

COPY package.json package-lock.json ./
COPY scripts/check-node-version.js scripts/postinstall-native.js ./scripts/

# Install all dependencies (including devDependencies for Vite)
RUN npm config set registry "$NPM_REGISTRY" \
    && npm config set replace-registry-host always \
    && npm_config_disturl="$NODE_DIST_URL" npm ci --fetch-retries=5 --fetch-retry-mintimeout=10000 --fetch-retry-maxtimeout=120000

# Copy source files needed for the Vite build
COPY vite.config.js ./
COPY scripts/ ./scripts/
COPY js/ ./js/
COPY styles/ ./styles/
COPY modules/ ./modules/
COPY docs/ ./docs/
COPY *.html ./
COPY sw.js manifest.json ./
COPY vendor/ ./vendor/

# Build frontend assets -> dist/
RUN npm run build

# ============================================================
# Stage 3: production - Minimal runtime image
# ============================================================
FROM node:22.23.2-alpine AS production

WORKDIR /app

# better-sqlite3 runtime needs libstdc++
ARG ALPINE_MIRROR=https://mirrors.tencent.com/alpine
RUN sed -i "s#https://dl-cdn.alpinelinux.org/alpine#$ALPINE_MIRROR#g" /etc/apk/repositories \
    && apk add --no-cache libstdc++

# Copy production node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy built frontend assets from build stage
COPY --from=build /app/dist ./dist

# Copy backend server code (needed at runtime)
COPY backend/ ./backend/
COPY config/ ./config/
COPY scripts/ ./scripts/

# Create data directory for SQLite databases
RUN mkdir -p backend/data && chown -R node:node /app

ENV NODE_ENV=production

USER node

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["node", "backend/proxy.js"]
