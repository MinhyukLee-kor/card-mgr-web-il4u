import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "로그인 - 법인카드 사용내역 관리",
  description: "법인카드 사용 내역을 관리하는 웹 애플리케이션",
};

export default function LoginLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
} 