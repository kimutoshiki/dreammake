/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Vercel 固有機能は使わない方針(ローカル/オンプレ優先)
  poweredByHeader: false,
  experimental: {
    // SSE ストリーミング応答用。Route Handler でデフォルト有効だが明示。
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
