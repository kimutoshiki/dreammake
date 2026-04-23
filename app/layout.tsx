import type { Metadata, Viewport } from 'next';
import './globals.css';
import { PwaAndOffline } from '@/components/PwaAndOffline';

export const metadata: Metadata = {
  title: 'しらべてつくろう!AIラボ',
  description: 'こどもが iPad で つくる・あそぶ・しらべる 学習アプリ',
  applicationName: 'しらべてつくろう!AIラボ',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'AIラボ',
    statusBarStyle: 'default',
  },
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
  formatDetection: {
    telephone: false,
  },
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
      <body data-grade="middle">
        <PwaAndOffline />
        {children}
      </body>
    </html>
  );
}
