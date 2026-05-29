# Multi-stage Dockerfile for Vite6 + React18 + TS SPA on Zeabur
# pnpm-lock.yaml 為 lockfileVersion 9.0 → 需 pnpm v9+，用 corepack 釘住版本。

# ============================================================
# Stage 1: Build
# ============================================================
FROM node:20-alpine AS builder

WORKDIR /app

# 啟用 corepack 並釘住 pnpm 版本（對齊 lockfileVersion 9.0）
# corepack 是 Node 內建，比 `npm i -g pnpm` 更穩定、版本可控
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# 先複製 lock file 與 package.json（最大化 Docker layer cache 命中）
COPY package.json pnpm-lock.yaml ./

# frozen-lockfile 確保 CI 與本機依賴一致
RUN pnpm install --frozen-lockfile

# 複製源碼
COPY . .

# 建置時注入 VITE_ 環境變數（Zeabur 會把面板變數帶進 build 階段）
# 這些值會被 bundle 進最終 JS，皆為公開金鑰（anon / URL-restricted）
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_MAPBOX_TOKEN
ARG VITE_API_BASE_URL
ARG VITE_GA_ID
ARG VITE_DEFAULT_THEME

# tsc -b + vite build（見 package.json "build" script）
RUN pnpm build

# ============================================================
# Stage 2: Runtime with nginx
# ============================================================
FROM nginx:alpine

# 從 builder 複製 dist 到 nginx 預設靜態路徑
COPY --from=builder /app/dist /usr/share/nginx/html

# 複製 nginx 配置（SPA fallback + gzip + 分層 cache-control）
COPY nginx.conf /etc/nginx/nginx.conf

# 開放 port 8080（Zeabur 預設偵測埠）
EXPOSE 8080

# Health check：探活 nginx
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
