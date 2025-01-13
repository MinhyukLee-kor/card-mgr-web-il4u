'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from "@/components/ui/card";
import { Receipt, BarChart, Settings, Bell } from 'lucide-react';

interface User {
  email: string;
  name: string;
  role: string;
}

interface Notice {
  content: string;
  date: string;
}

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [notices, setNotices] = useState<Notice[]>([]);

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

  useEffect(() => {
    const fetchNotices = async () => {
      try {
        const response = await fetch('/api/notices', {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'Pragma': 'no-cache'
          }
        });
        const data = await response.json();
        setNotices(data.notices);
      } catch (error) {
        console.error('공지사항 조회 실패:', error);
      }
    };

    fetchNotices();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return (
    <div className="container mx-auto py-4 px-2 sm:py-10 sm:px-4">
      {/* 공지사항 섹션 */}
      {notices.length > 0 && (
        <div className="mb-8 max-w-2xl mx-auto px-4 sm:px-0">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Bell className="h-5 w-5 text-yellow-500" />
              <h2 className="text-lg font-semibold">공지사항</h2>
            </div>
            <div className="space-y-3">
              {notices.map((notice, index) => (
                <div 
                  key={index}
                  className="flex flex-col sm:flex-row sm:justify-between sm:items-center border-b last:border-0 pb-3 last:pb-0 gap-2"
                >
                  <p className="text-sm font-bold text-gray-700 flex-1 break-all">{notice.content}</p>
                  <span className="text-xs text-gray-500 min-w-[90px] sm:text-right">
                    {formatDate(notice.date)}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* 메인 메뉴 섹션 */}
      <div className="px-4 sm:px-0">
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">
            카드 사용 관리 시스템
          </h1>
          <p className="text-gray-600">
            사용 내역을 조회하고 메뉴 분석을 확인하세요.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
          <Card
            onClick={() => router.push('/expenses')}
            className="p-6 hover:bg-yellow-300 transition-colors cursor-pointer flex flex-col items-center justify-center min-h-[200px] border-2"
          >
            <Receipt className="h-16 w-16 mb-4 text-blue-600" />
            <h2 className="text-xl font-semibold mb-2">사용 내역 조회</h2>
            <p className="text-gray-600 text-sm text-center">
              카드 사용 내역을 조회하고<br />관리할 수 있습니다.
            </p>
          </Card>

          <Card
            onClick={() => router.push('/menu-analysis')}
            className="p-6 hover:bg-yellow-300 transition-colors cursor-pointer flex flex-col items-center justify-center min-h-[200px] border-2"
          >
            <BarChart className="h-16 w-16 mb-4 text-green-600" />
            <h2 className="text-xl font-semibold mb-2">메뉴 분석</h2>
            <p className="text-gray-600 text-sm text-center">
              주문한 메뉴의 통계와<br />정보를 확인할 수 있습니다.
            </p>
          </Card>

          {user?.role === 'ADMIN' && (
            <Card
              onClick={() => router.push('/admin/expenses')}
              className="p-6 hover:bg-yellow-300 transition-colors cursor-pointer flex flex-col items-center justify-center min-h-[200px] border-2 sm:col-span-2"
            >
              <Settings className="h-16 w-16 mb-4 text-purple-600" />
              <h2 className="text-xl font-semibold mb-2">관리자</h2>
              <p className="text-gray-600 text-sm text-center">
                전체 사용 내역을 조회하고<br />관리할 수 있습니다.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
