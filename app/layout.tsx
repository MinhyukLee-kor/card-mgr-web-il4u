import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import { InstallPWA } from "@/components/InstallPWA";
import { headers } from 'next/headers';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "카드 사용내역 관리",
  description: "카드 사용 내역을 관리하는 웹 애플리케이션",
  manifest: '/manifest.json',
  themeColor: '#FFFFFF',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
  icons: {
    icon: '/icons/icon-512x512.png',
    apple: '/icons/icon-192x192.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = headers();
  const showHeader = headersList.get('x-show-header') !== 'false';

  return (
    <html lang="ko">
      <body className={inter.className}>
        <div className="min-h-screen flex flex-col">
          {showHeader && <Header />}
          <main className="flex-1">
            {children}
          </main>
          {showHeader && <InstallPWA />}
        </div>
      </body>
    </html>
  );
}
