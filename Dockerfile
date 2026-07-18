# ============================================================
# Stage 1: deps - Install production dependencies only
# ============================================================
FROM node:22-alpine AS deps

WORKDIR /app

# better-sqlite3 needs python3, make, g++ to compile native addons
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./

RUN npm ci --omit=dev

# ============================================================
# Stage 2: build - Build frontend assets with Vite
# ============================================================
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./

# Install all dependencies (including devDependencies for Vite)
RUN npm ci

# Copy source files needed for the Vite build
COPY vite.config.js ./
COPY scripts/prepare-dist.js ./scripts/prepare-dist.js
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
FROM node:22-alpine AS production

WORKDIR /app

# better-sqlite3 runtime needs libstdc++
RUN apk add --no-cache libstdc++

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
