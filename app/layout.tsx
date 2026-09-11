import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(
    'https://arreylalala.github.io/four-friends-stock-league/',
  ),
  title: {
    default: '华尔街之狼 · 股票战报',
    template: '%s · 华尔街之狼',
  },
  description: '伦、镭、健、超的每日股票盈亏与月度排行榜。',
  openGraph: {
    title: '华尔街之狼 · 股票战报',
    description: '四位朋友的每日盈亏、月度榜单与走势。',
    locale: 'zh_CN',
    type: 'website',
    images: [
      {
        url: 'https://arreylalala.github.io/four-friends-stock-league/og.png',
        width: 1792,
        height: 1024,
        alt: '华尔街之狼股票战报',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '华尔街之狼 · 股票战报',
    description: '四位朋友的每日盈亏、月度榜单与走势。',
    images: [
      'https://arreylalala.github.io/four-friends-stock-league/og.png',
    ],
  },
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#f6f3eb',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
