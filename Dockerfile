# syntax=docker/dockerfile:1

# -----------------------------------------------------------------------------
# Stage 1: Build Frontend Assets
# -----------------------------------------------------------------------------
FROM node:20-bookworm-slim AS builder

WORKDIR /app

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
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# 1. Install CJK fonts (essential for accurate visual testing on Chinese pages)
# 2. Install curl for container healthcheck
# 3. Create shared playwright browser directory
RUN apt-get update && apt-get install -y --no-install-recommends \
    fonts-noto-cjk \
    fonts-liberation \
    fonts-freefont-ttf \
    curl \
    ca-certificates \
    && mkdir -p /ms-playwright \
    && chmod 777 /ms-playwright \
    && rm -rf /var/lib/apt/lists/*

# Copy package descriptors
COPY package.json package-lock.json ./

# Install production dependencies and tsx, then install Playwright Chromium with OS libraries
RUN npm ci --omit=dev \
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
