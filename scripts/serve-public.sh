#!/usr/bin/env bash
# Codespace で Next.js 本番サーバーを 永続起動 + ポート 3000 を public 化。
# Codespace が 起動している間 だけ 有効。Codespace が 落ちたら、
# 再起動後に もう一度 これを 実行する。
#
#   bash scripts/serve-public.sh
#
# 公開 URL: https://${CODESPACE_NAME}-3000.app.github.dev/
set -euo pipefail
cd "$(dirname "$0")/.."

# 既存の next-server を 停める(再起動扱い)
pkill -f "next-server" 2>/dev/null || true
sleep 1

# ビルド済みでなければ ビルド
if [[ ! -d .next ]]; then
  echo "📦 .next がないので ビルドします"
  pnpm build
fi

# setsid + nohup + stdin を /dev/null に することで、
# 親シェルが 終わっても Next.js が 残り続ける。
echo "🚀 Next.js を 永続起動 (setsid)"
setsid nohup pnpm start > /tmp/nextstart.log 2>&1 < /dev/null &
disown || true

# サーバーが 立ち上がるのを 待つ
for i in {1..30}; do
  if curl -fsS http://localhost:3000/healthz >/dev/null 2>&1; then
    echo "✅ http://localhost:3000 起動 OK"
    break
  fi
  sleep 1
done

# ポートを public に
if [[ -n "${CODESPACE_NAME:-}" ]]; then
  echo "🌐 ポート 3000 を public 化"
  gh codespace ports visibility 3000:public -c "$CODESPACE_NAME" || true
  DOMAIN="${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-app.github.dev}"
  echo ""
  echo "📣 公開 URL: https://${CODESPACE_NAME}-3000.${DOMAIN}/"
fi

echo ""
echo "ログ: tail -f /tmp/nextstart.log"
echo "停止: pkill -f next-server"
