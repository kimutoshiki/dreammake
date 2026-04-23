import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'しらべてつくろう!AIラボ',
  description:
    '「AIに出てこないのは誰か」を問い続ける、小学校社会科の探究学習プラットフォーム',
  applicationName: 'しらべてつくろう!AIラボ',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#FF8C42',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body data-grade="middle">{children}</body>
    </html>
  );
}
