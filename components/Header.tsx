'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { LogOut, Settings } from 'lucide-react';

interface User {
  email: string;
  name: string;
  role: string;
}

export function Header() {
  const router = useRouter();
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

  const handleAdminClick = () => {
    router.push('/admin/expenses');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex">
          <a className="mr-2 flex items-center space-x-2" href="/">
            <span className="font-bold sm:inline-block">
              법인카드 관리
            </span>
          </a>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-2">
          {user && (
            <>
              <span className="text-sm text-gray-500 hidden sm:inline-block">
                {user.name}님 환영합니다
              </span>
              {user.role === 'ADMIN' && (
                <Button
                  variant="outline"
                  onClick={handleAdminClick}
                  className="h-9 sm:h-auto sm:w-auto sm:px-4 flex items-center gap-1"
                  title="관리자"
                >
                  <Settings className="h-4 w-4" />
                  <span className="text-xs sm:hidden">ADMIN</span>
                  <span className="hidden sm:inline">ADMIN</span>
                </Button>
              )}
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