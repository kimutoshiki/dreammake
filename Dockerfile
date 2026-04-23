# しらべてつくろう!AIラボ — Docker 化(学校の PC で `docker compose up` するだけで動く)
# - ベース: Node 20 (slim)
# - 開発・教室運用 前提:SQLite + ローカルファイル storage を ボリュームに 永続化
# - 本番 性能 は 求めていないので multi-stage は シンプルに

FROM node:20-slim AS base
ENV PNPM_HOME="/root/.local/share/pnpm"
ENV PATH="${PNPM_HOME}:${PATH}"
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

# ---- deps ----
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile

# ---- builder ----
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# ビルド時の env 検証を通すため、ダミーの DB URL だけ 与える(実行時は compose の env で上書き)
ENV DATABASE_URL="file:/app/prisma/dev.db"
RUN pnpm prisma generate \
 && pnpm build

# ---- runner ----
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
# 日本語フォントと SQLite を ランタイム に
RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates \
      fonts-noto-cjk \
      sqlite3 \
 && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.mjs ./next.config.mjs

# SQLite と アップロード作品を 永続化するボリューム位置
VOLUME ["/app/prisma", "/app/public/uploads"]

EXPOSE 3000
CMD ["sh", "-lc", "pnpm prisma migrate deploy && pnpm db:seed || true; pnpm start"]
