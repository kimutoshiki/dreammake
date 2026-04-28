/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Vercel 固有機能は使わない方針(ローカル/オンプレ優先)
  poweredByHeader: false,
  experimental: {
    // Server Actions の Origin/Host チェックを通したい 公開ホスト。
    // GitHub Codespaces の ポート公開 と Fly.io デプロイで 必要。
    // - `${CODESPACE_NAME}-3000.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}` を
    //   ランタイムに 自動で 許可。
    // - ENV `PUBLIC_HOST` (カンマ区切り) が あれば 追加で 許可。
    // Vercel 等の サーバレス環境で 起動時に migrations.sql を 読めるよう
    // 関数バンドルに 含める。これがないと file:/tmp/dev.db で 初期化 できない。
    outputFileTracingIncludes: {
      '/**': ['./prisma/migrations/**/*.sql'],
    },
    serverActions: {
      allowedOrigins: [
        'localhost:3000',
        // Codespace 公開ポート
        ...(process.env.CODESPACE_NAME && process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN
          ? [`${process.env.CODESPACE_NAME}-3000.${process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}`]
          : []),
        // Vercel デプロイ URL(プレビュー も 含む)
        ...(process.env.VERCEL_URL ? [process.env.VERCEL_URL] : []),
        ...(process.env.VERCEL_PROJECT_PRODUCTION_URL ? [process.env.VERCEL_PROJECT_PRODUCTION_URL] : []),
        // カスタム ホスト(カンマ区切り)
        ...(process.env.PUBLIC_HOST ? process.env.PUBLIC_HOST.split(',').map((h) => h.trim()) : []),
      ],
    },
  },
  async headers() {
    return [
      {
        // つくってみようモードの iframe 親ページ(/kids/units/[id]/app 配下)
        // に適用する CSP は Phase 5 で個別に追加する。
        // ここではアプリ全体の基本セキュリティヘッダーのみ。
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value:
              'camera=(self), microphone=(self), geolocation=(), interest-cohort=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
