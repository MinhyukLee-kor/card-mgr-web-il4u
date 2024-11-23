'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { LogOut } from 'lucide-react';

export default function Header() {
  const router = useRouter();
  const [userName, setUserName] = useState<string>('');

  useEffect(() => {
    const getUserFromCookie = () => {
      try {
        const userCookie = document.cookie
          .split(';')
          .find(c => c.trim().startsWith('user='));

        if (userCookie) {
          const userValue = userCookie.split('=')[1];
          const userData = JSON.parse(decodeURIComponent(userValue));
          if (userData && userData.name) {
            setUserName(userData.name);
          }
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
      });

      if (response.ok) {
        router.push('/login');
        router.refresh();
      }
    } catch (error) {
      console.error('로그아웃 중 오류 발생:', error);
    }
  };

  return (
    <header className="border-b">
      <div className="container mx-auto px-4 py-2 sm:py-0">
        <div className="relative flex items-center justify-between h-16">
          <div className="flex flex-col justify-center">
            <div className="font-semibold text-lg">법인카드 사용내역 관리</div>
            {userName && (
              <div className="text-sm text-gray-600">
                환영합니다. {userName}님
              </div>
            )}
          </div>
          <Button
            onClick={handleLogout}
            variant="ghost"
            className="gap-2 absolute right-0 top-1/2 -translate-y-1/2"
            title="로그아웃"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">로그아웃</span>
          </Button>
        </div>
      </div>
    </header>
  );
} 