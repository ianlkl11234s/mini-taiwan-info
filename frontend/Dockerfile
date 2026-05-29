# syntax=docker/dockerfile:1

# ---------- Stage 1: build ----------
FROM node:20-alpine AS builder
WORKDIR /app

# corepack 釘住 pnpm（與 pnpm-lock.yaml lockfileVersion 9.0 相容）
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# 先裝依賴，利用 layer cache
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# VITE_ build-time 變數（Zeabur 以 build-arg 注入；Vite 在 build 階段 inline 進 bundle）
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_MAPBOX_TOKEN
ARG VITE_API_BASE_URL
ARG VITE_GA_ID
ARG VITE_DEFAULT_THEME

# ARG 不會自動進 RUN 的環境 → 轉 ENV 讓 vite build 讀得到
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY \
    VITE_MAPBOX_TOKEN=$VITE_MAPBOX_TOKEN \
    VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_GA_ID=$VITE_GA_ID \
    VITE_DEFAULT_THEME=$VITE_DEFAULT_THEME

# 複製原始碼並 build
COPY . .
RUN pnpm build

# ---------- Stage 2: serve ----------
FROM nginx:alpine AS runner

# 用完整 nginx 設定取代預設（含 SPA fallback + gzip + 分層 cache-control、listen 8080）
COPY nginx.conf /etc/nginx/nginx.conf

# build 產物放到 web root
RUN rm -rf /usr/share/nginx/html/*
COPY --from=builder /app/dist /usr/share/nginx/html

# Zeabur 偵測埠（與 nginx.conf listen 8080 對齊）
EXPOSE 8080

# healthcheck（wget 在 nginx:alpine 內建）
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://localhost:8080/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
