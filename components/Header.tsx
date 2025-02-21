'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { LogOut, Settings, User } from 'lucide-react';

interface User {
  email: string;
  name: string;
  role: string;
}

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const getUserFromCookie = () => {
      try {
        const cookies = document.cookie.split(';').reduce((acc, cookie) => {
          const [key, value] = cookie.trim().split('=');
          acc[key] = value;
          return acc;
        }, {} as { [key: string]: string });

        if (cookies.user) {
          const userData = JSON.parse(decodeURIComponent(cookies.user));
          setUser(userData);
        }
      } catch (error) {
        console.error('Error parsing user cookie:', error);
      }
    };

    getUserFromCookie();
  }, []);

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache'
        }
      });

      if (response.ok) {
        router.push('/login');
        router.refresh();
      } else {
        console.error('로그아웃 실패');
      }
    } catch (error) {
      console.error('로그아웃 중 오류 발생:', error);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center pr-1 pl-1">
        <div className="relative mr-4">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex flex-col justify-center items-center w-8 h-8 space-y-1.5"
            aria-label="메뉴 열기"
          >
            <span className="block w-5 h-0.5 bg-gray-600"></span>
            <span className="block w-5 h-0.5 bg-gray-600"></span>
            <span className="block w-5 h-0.5 bg-gray-600"></span>
          </button>

          {isMenuOpen && (
            <>
              <div
                className="fixed inset-0 bg-black bg-opacity-50"
                onClick={() => setIsMenuOpen(false)}
              ></div>
              <div className="absolute top-10 left-0 w-48 bg-white rounded-md shadow-lg border">
                <nav className="py-1">
                  <Link
                    href="/expenses"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    사용 내역 조회
                  </Link>
                  <Link
                    href="/menu-analysis"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    메뉴분석
                  </Link>
                  <Link
                    href="/menu-calendar"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    메뉴 달력
                  </Link>
                  {user?.role === 'ADMIN' && (
                    <Link
                      href="/admin/expenses"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      관리자
                    </Link>
                  )}
                </nav>
              </div>
            </>
          )}
        </div>

        <div className="mr-4 flex">
          <Link href="/" className="mr-2 flex items-center space-x-2">
            <span className="font-bold sm:inline-block">
              카드사용 관리
            </span>
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-end space-x-2">
          {user && (
            <>
              <span className="text-sm text-gray-500 hidden sm:inline-block">
                {user.name}님 환영합니다
              </span>
              <div 
                onClick={() => router.push('/mypage')}
                className="h-10 w-10 sm:h-9 sm:w-auto sm:px-4 rounded-md border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 flex items-center justify-center cursor-pointer"
                title="마이페이지"
              >
                <User className="h-6 w-6 sm:hidden" />
                <span className="hidden sm:inline">내 정보</span>
              </div>
              <div 
                onClick={handleLogout}
                className="h-10 w-10 sm:h-9 sm:w-auto sm:px-4 rounded-md border border-red-300 bg-red-100 hover:bg-red-200 text-red-700 flex items-center justify-center cursor-pointer"
                title="로그아웃"
              >
                <LogOut className="h-6 w-6 sm:hidden" />
                <span className="hidden sm:inline">로그아웃</span>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
} 