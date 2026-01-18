import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AgeShift Story - 年齢変換と人物紹介生成',
  description: '顔写真から年齢を変換し、小説風の人物紹介を生成するアプリケーション',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
