# syntax=docker/dockerfile:1

# -----------------------------------------------------------------------------
# Stage 1: Build Frontend Assets
# -----------------------------------------------------------------------------
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Accelerate npm downloads
RUN npm config set registry https://registry.npmmirror.com

# Install build dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build client (vite build -> dist/)
COPY . .
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 2: Production Runner
# -----------------------------------------------------------------------------
FROM node:20-bookworm-slim AS runner

WORKDIR /app

# Set environment variables
ENV NODE_ENV=production \
    PORT=4318 \
    HOST=0.0.0.0 \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
    PLAYWRIGHT_DOWNLOAD_HOST=https://npmmirror.com/mirrors/playwright

# 1. Switch Debian source to domestic mirror for fast & resilient apt downloads
# 2. Install lightweight CJK font (wqy-microhei ~10MB vs noto-cjk ~100MB) & required tools
# 3. Create shared playwright browser directory
RUN sed -i 's@deb.debian.org@mirrors.aliyun.com@g' /etc/apt/sources.list.d/debian.sources 2>/dev/null || true \
    && sed -i 's@deb.debian.org@mirrors.aliyun.com@g' /etc/apt/sources.list 2>/dev/null || true \
    && sed -i 's@security.debian.org@mirrors.aliyun.com@g' /etc/apt/sources.list.d/debian.sources 2>/dev/null || true \
    && sed -i 's@security.debian.org@mirrors.aliyun.com@g' /etc/apt/sources.list 2>/dev/null || true \
    && apt-get update && apt-get install -y --no-install-recommends \
        fonts-wqy-microhei \
        fonts-wqy-zenhei \
        fonts-liberation \
        curl \
        ca-certificates \
    && mkdir -p /ms-playwright \
    && chmod 777 /ms-playwright \
    && rm -rf /var/lib/apt/lists/*

# Copy package descriptors
COPY package.json package-lock.json ./

# Configure npmmirror registry, install production dependencies + Playwright Chromium
RUN npm config set registry https://registry.npmmirror.com \
    && npm ci --omit=dev \
    && npm install -g tsx \
    && npx playwright install --with-deps chromium \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /root/.cache /root/.npm

# Copy compiled frontend from builder
COPY --from=builder /app/dist ./dist

# Copy backend server code, shared type/locale definitions and configs
COPY server ./server
COPY src ./src
COPY tsconfig.json ./tsconfig.json
COPY acceptance.example.yaml ./acceptance.example.yaml
COPY example ./example

EXPOSE 4318

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://127.0.0.1:4318/api/health || exit 1

CMD ["npm", "start"]
