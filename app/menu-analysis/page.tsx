'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loading } from "@/components/ui/loading";
import { MenuRoulette } from '@/components/MenuRoulette';

type ViewType = 'personal' | 'all';

interface MenuStat {
  menu: string;
  count: number;
  percentage: string;
  lastUsed: string;
}

interface MenuAnalysis {
  popularity: MenuStat[];
  oldestUsed: MenuStat[];
}

export default function MenuAnalysisPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [viewType, setViewType] = useState<ViewType>('all');
  const [analysis, setAnalysis] = useState<MenuAnalysis | null>(null);
  const [currentUser, setCurrentUser] = useState<{ email: string; name: string } | null>(null);
  const [userEmail, setUserEmail] = useState('');
  const [menus, setMenus] = useState<string[]>([]);

  useEffect(() => {
    // 현재 로그인한 사용자 정보 가져오기
    const getUserFromCookie = () => {
      try {
        const cookies = document.cookie.split(';').reduce((acc, cookie) => {
          const [key, value] = cookie.trim().split('=');
          acc[key] = value;
          return acc;
        }, {} as { [key: string]: string });

        if (cookies.user) {
          const userData = JSON.parse(decodeURIComponent(cookies.user));
          setCurrentUser({
            email: userData.email,
            name: userData.name
          });
          setUserEmail(userData.email);
        }
      } catch (error) {
        console.error('Error parsing user cookie:', error);
      }
    };

    getUserFromCookie();

    // 초기 날짜 설정
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - 3);
    
    setEndDate(end.toISOString().split('T')[0]);
    setStartDate(start.toISOString().split('T')[0]);

    // 메뉴 목록 가져오기
    const fetchMenus = async () => {
      try {
        const response = await fetch('/api/menus', {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'Pragma': 'no-cache'
          }
        });
        
        if (!response.ok) {
          throw new Error('메뉴 목록을 가져오는데 실패했습니다.');
        }
        
        const data = await response.json();
        
        if (Array.isArray(data.menus)) {
          setMenus(data.menus);
        } else {
          console.error('메뉴 데이터가 배열이 아님:', data);
        }
      } catch (error) {
        console.error('메뉴 목록 조회 중 오류 발생:', error);
      }
    };

    fetchMenus();
  }, []);

  const fetchAnalysis = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        startDate,
        endDate,
        viewType,
        ...(viewType === 'personal' && { userName: currentUser?.name })
      });

      const response = await fetch(`/api/menu-analysis?${params}`);
      const data = await response.json();
      setAnalysis(data.analysis);
    } catch (error) {
      console.error('메뉴 분석 데이터 조회 중 오류 발생:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getDaysAgo = (dateString: string) => {
    const days = Math.floor(
      (new Date().getTime() - new Date(dateString).getTime()) / (1000 * 60 * 60 * 24)
    );
    return `${days}일 전`;
  };

  return (
    <>
      {isLoading && <Loading />}
      <div className="container mx-auto py-4 px-2 sm:py-10 sm:px-4">
        {/* 메뉴 룰렛 추가 */}
        <MenuRoulette menus={menus} />

        <div className="space-y-4 mb-6">
          {/* 날짜 선택 */}
          <div className="flex gap-2">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full"
            />
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full"
            />
          </div>

          {/* 조회 기준 선택 */}
          <div className="grid grid-cols-2 gap-2">
            <label className="flex items-center justify-center px-3 py-2 border rounded-md bg-white cursor-pointer transition-colors hover:bg-gray-50">
              <input
                type="radio"
                checked={viewType === 'personal'}
                onChange={() => setViewType('personal')}
                className="hidden"
              />
              <span className={`text-sm ${viewType === 'personal' ? 'text-blue-600 font-semibold' : 'text-gray-600'}`}>
                내 주문 기준
              </span>
            </label>
            <label className="flex items-center justify-center px-3 py-2 border rounded-md bg-white cursor-pointer transition-colors hover:bg-gray-50">
              <input
                type="radio"
                checked={viewType === 'all'}
                onChange={() => setViewType('all')}
                className="hidden"
              />
              <span className={`text-sm ${viewType === 'all' ? 'text-blue-600 font-semibold' : 'text-gray-600'}`}>
                전체 주문 기준
              </span>
            </label>
          </div>

          {/* 조회 버튼 */}
          <Button 
            onClick={fetchAnalysis}
            className="w-full"
          >
            조회하기
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 메뉴 순위 */}
          <Card>
            <CardHeader>
              <CardTitle>즐겨먹는 맘마</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {analysis?.popularity?.map((item, index) => (
                  <div key={index} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold w-6">{index + 1}</span>
                      <span>{item.menu}</span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {item.count}회 ({item.percentage}%)
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 먹을 때 된 메뉴 */}
          <Card>
            <CardHeader>
              <CardTitle>생각나는 맘마</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {analysis?.oldestUsed.map((item, index) => (
                  <div key={index} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
                    <span>{item.menu}</span>
                    <span className="text-sm text-gray-500">
                      {getDaysAgo(item.lastUsed)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
