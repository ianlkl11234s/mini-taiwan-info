# syntax=docker/dockerfile:1
#
# Root Dockerfile — GitHub 部署用（Zeabur 從 repo 根偵測 → 必選 docker plan）
# 應用實際在 frontend/，且 build 時 themes.ts 會 glob `../../../themes/*.yaml`
# （repo 根 themes/，是 frontend/ 的 sibling）。故 Docker 內須保留
#   /app/frontend/  +  /app/themes/  的相對結構，從 /app/frontend build。

# ---------- Stage 1: build ----------
FROM node:20-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# 先裝依賴（layer cache）
COPY frontend/package.json frontend/pnpm-lock.yaml ./frontend/
RUN cd frontend && pnpm install --frozen-lockfile

# VITE_ build-time 變數（Zeabur build-arg 注入）
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_MAPBOX_TOKEN
ARG VITE_API_BASE_URL
ARG VITE_GA_ID
ARG VITE_DEFAULT_THEME
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY \
    VITE_MAPBOX_TOKEN=$VITE_MAPBOX_TOKEN \
    VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_GA_ID=$VITE_GA_ID \
    VITE_DEFAULT_THEME=$VITE_DEFAULT_THEME

# 前端原始碼 + sibling themes/（manifest SSOT，build 時 glob）
COPY frontend/ ./frontend/
COPY themes/ ./themes/

RUN cd frontend && pnpm build

# ---------- Stage 2: serve ----------
FROM nginx:alpine AS runner

COPY frontend/nginx.conf /etc/nginx/nginx.conf

RUN rm -rf /usr/share/nginx/html/*
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://localhost:8080/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
