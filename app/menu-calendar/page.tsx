'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Loading } from "@/components/ui/loading";
import { Calendar } from '@/components/Calendar';

interface MenuCalendarData {
  date: string;
  menu: string;
  type: '점심식대' | '저녁식대' | '야근식대';
}

export default function MenuCalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [menuData, setMenuData] = useState<MenuCalendarData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchMenuData();
  }, [currentDate]);

  const fetchMenuData = async () => {
    try {
      setIsLoading(true);
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      
      const response = await fetch(`/api/menu-calendar?year=${year}&month=${month}`);
      const data = await response.json();
      setMenuData(data.menuData);
    } catch (error) {
      console.error('메뉴 데이터 조회 중 오류 발생:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)));
  };

  return (
    <div className="container mx-auto py-4 px-2 sm:py-10 sm:px-4">
      {isLoading && <Loading />}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="text-base">메뉴 달력</span>
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={prevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-base">
                {currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월
              </span>
              <Button variant="outline" onClick={nextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Calendar currentDate={currentDate} menuData={menuData} />
        </CardContent>
      </Card>
    </div>
  );
} 