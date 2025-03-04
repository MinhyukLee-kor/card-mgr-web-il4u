'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Receipt, BarChart, Settings, Bell, Plus, Calendar } from 'lucide-react';
import { ChangePasswordModal } from '@/components/ChangePasswordModal';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Button } from "@/components/ui/button";

interface User {
  email: string;
  name: string;
  role: string;
  passwordChangedAt?: string | null;
  companyName: string;
}

interface Notice {
  content: string;
  date: string;
}

interface UsageChartProps {
  usage: number;
  limit: number;
}

const UsageChart = ({ usage, limit }: UsageChartProps) => {
  const percentage = Math.min((usage / limit) * 100, 100);
  const data = [
    { name: '사용액', value: usage },
    { name: '잔액', value: Math.max(limit - usage, 0) }
  ];
  const COLORS = ['#0088FE', '#EEEEEE'];

  return (
    <Card className="mb-2 max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-center">이번 달 사용 현황</CardTitle>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="h-[120px] sm:h-[150px] relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                startAngle={180}
                endAngle={0}
                innerRadius="60%"
                outerRadius="100%"
                paddingAngle={0}
                dataKey="value"

              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={COLORS[index]}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 text-center w-full">
            <div className="text-xl sm:text-2xl font-bold">
              {usage.toLocaleString()} / {limit.toLocaleString()}
            </div>
            <div className="text-sm text-gray-500">원</div>
          </div>
        </div>
        
      </CardContent>
    </Card>
  );
};

const NoticesSkeleton = () => (
  <div className="animate-pulse space-y-2">
    {[1, 2, 3].map((i) => (
      <div key={i} className="flex justify-between items-center gap-2">
        <div className="h-3 bg-gray-200 rounded w-3/4"></div>
        <div className="h-3 bg-gray-200 rounded w-20"></div>
      </div>
    ))}
  </div>
);

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [isNoticeLoading, setIsNoticeLoading] = useState(true);
  const noticesFetched = useRef(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [monthlyUsage, setMonthlyUsage] = useState(0);
  const [userCompany, setUserCompany] = useState<string>('');
  const MONTHLY_LIMIT = userCompany === '아이엘포유' ? 200000 : 250000;
  const [error, setError] = useState<string | null>(null);

  const CACHE_EXPIRY = 5 * 60 * 1000; // 5분

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
          setUserCompany(userData.companyName);
          
          if (!userData.passwordChangedAt) {
            setIsPasswordModalOpen(true);
          }
        }
      } catch (error) {
        console.error('Error parsing user cookie:', error);
      }
    };

    getUserFromCookie();
  }, []);

  const fetchNotices = useCallback(async () => {
    const cacheKey = `notices_${userCompany}`;
    const cachedData = sessionStorage.getItem(cacheKey);
    
    if (cachedData) {
      const { data, timestamp } = JSON.parse(cachedData);
      const isExpired = Date.now() - timestamp > CACHE_EXPIRY;
      
      if (!isExpired) {
        setNotices(data);
        setIsNoticeLoading(false);
        return;
      }
    }

    if (noticesFetched.current) return;
    
    try {
      const userCompany = user?.companyName;
      if (!userCompany) return;

      setIsNoticeLoading(true);
      const response = await fetch('/api/notices');
      const data = await response.json();
      setNotices(data.notices);
      
      sessionStorage.setItem(cacheKey, JSON.stringify({
        data: data.notices,
        timestamp: Date.now()
      }));
      noticesFetched.current = true;
    } catch (error) {
      console.error('공지사항 조회 실패:', error);
      setError('공지사항을 불러오는데 실패했습니다.');
      setNotices([]);
    } finally {
      setIsNoticeLoading(false);
    }
  }, [user?.companyName, userCompany, CACHE_EXPIRY]);

  useEffect(() => {
    fetchNotices();
  }, [fetchNotices]);

  useEffect(() => {
    const fetchMonthlyUsage = async () => {
      try {
        const now = new Date();
        // 현재 달의 첫날 (시간을 00:00:00으로 설정)
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        firstDay.setHours(0, 0, 0, 0);
        
        // 다음 달의 첫날 - 1 (현재 달의 마지막 날, 시간을 23:59:59로 설정)
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        lastDay.setHours(23, 59, 59, 999);
        
        // 한국 시간으로 변환
        const koreaFirstDay = new Date(firstDay.getTime() + (9 * 60 * 60 * 1000));
        const koreaLastDay = new Date(lastDay.getTime() + (9 * 60 * 60 * 1000));
        
        const formatDate = (date: Date) => {
          return date.toISOString().split('T')[0];
        };

        const params = new URLSearchParams({
          startDate: formatDate(koreaFirstDay),
          endDate: formatDate(koreaLastDay),
          viewType: 'user',
          expenseTypes: '점심식대,저녁식대,차대'
        });

        const response = await fetch(`/api/expenses?${params}`);
        const data = await response.json();

        if (response.ok) {
          const total = data.expenses.reduce((sum: number, expense: any) => {
            return sum + expense.amount;
          }, 0);
          setMonthlyUsage(total);
        }
      } catch (error) {
        console.error('사용 금액 조회 중 오류 발생:', error);
      }
    };

    fetchMonthlyUsage();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // 날짜 기준 내림차순 정렬
  const sortedNotices = notices.sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="container mx-auto py-4 px-2 sm:py-10 sm:px-4 mb-4">
      {/* 공지사항 섹션 */}
      <div className="mb-2 max-w-2xl mx-auto px-4 sm:px-0">
        <Card className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <Bell className="h-4 w-4 text-yellow-500" />
            <h2 className="text-base font-semibold">공지사항</h2>
          </div>
          <div className="min-h-[30px]">
            {isNoticeLoading ? (
              <NoticesSkeleton />
            ) : notices.length > 0 ? (
              <div className="space-y-2">
                {sortedNotices.map((notice, index) => (
                  <div 
                    key={index}
                    className="flex flex-col sm:flex-row sm:justify-between sm:items-center border-b last:border-0 pb-2 last:pb-0 gap-1"
                  >
                    <p className="text-xs text-gray-700 flex-1 break-all">{notice.content}</p>
                    <span className="text-xs text-gray-500 min-w-[80px] sm:text-right">
                      {formatDate(notice.date)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-[80px] text-gray-500 text-xs">
                등록된 공지사항이 없습니다.
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* 사용 현황 차트 */}
      <div className="px-4 sm:px-0">
        <UsageChart usage={monthlyUsage} limit={MONTHLY_LIMIT} />
      </div>
      {/* 메인 메뉴 섹션 */}
      <div className="px-4 sm:px-0">
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

          <Card
            onClick={() => router.push('/menu-calendar')}
            className="p-6 hover:bg-yellow-300 transition-colors cursor-pointer flex flex-col items-center justify-center min-h-[200px] border-2"
          >
            <Calendar className="h-16 w-16 mb-4 text-purple-600" />
            <h2 className="text-xl font-semibold mb-2">메뉴 달력</h2>
            <p className="text-gray-600 text-sm text-center">
              날짜별로 먹은 메뉴를<br />확인할 수 있습니다.
            </p>
          </Card>

          {user?.role === 'ADMIN' && (
            <Card
              onClick={() => router.push('/admin/expenses')}
              className="p-6 hover:bg-yellow-300 transition-colors cursor-pointer flex flex-col items-center justify-center min-h-[200px] border-2"
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

      {/* 플로팅 액션 버튼 추가 */}
      <button
        onClick={() => router.push('/expenses/create')}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 
                   text-white rounded-full shadow-lg flex items-center justify-center 
                   transition-colors duration-200 z-50"
        aria-label="사용내역 등록"
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* 비밀번호 변경 모달 */}
      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        forceChange={!user?.passwordChangedAt}
      />

      {/* 에러 메시지 표시 */}
      {error && (
        <div className="text-sm text-red-500 text-center p-2">
          {error}
        </div>
      )}
    </div>
  );
}
