'use client';

import { useMemo } from 'react';
import { Beer } from 'lucide-react';

interface CalendarProps {
  currentDate: Date;
  menuData: MenuCalendarData[];
}

interface MenuCalendarData {
  date: string;
  menu: string;
  type: '점심식대' | '저녁식대' | '야근식대';
  isDrinking: boolean;
}

export function Calendar({ currentDate, menuData }: CalendarProps) {
  const calendar = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // 해당 월의 첫 날과 마지막 날
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // 달력에 표시할 날짜 배열 생성
    const days = [];
    const startDay = firstDay.getDay(); // 첫 날의 요일 (0: 일요일)
    
    // 이전 달의 날짜들
    for (let i = 0; i < startDay; i++) {
      const date = new Date(year, month, -startDay + i + 1);
      days.push({ date, isCurrentMonth: false });
    }
    
    // 현재 달의 날짜들
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const date = new Date(year, month, i);
      days.push({ date, isCurrentMonth: true });
    }
    
    // 다음 달의 날짜들 (6주를 채우기 위해)
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, month + 1, i);
      days.push({ date, isCurrentMonth: false });
    }
    
    return days;
  }, [currentDate]);

  const getMenuForDate = (date: Date) => {
    // 날짜를 YYYY-MM-DD 형식으로 변환
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return menuData.filter(item => item.date === dateStr);
  };

  return (
    <div className="grid grid-cols-7 gap-1">
      {['일', '월', '화', '수', '목', '금', '토'].map(day => (
        <div key={day} className="p-1 sm:p-2 text-center font-semibold text-xs sm:text-sm">
          {day}
        </div>
      ))}
      
      {calendar.map(({ date, isCurrentMonth }, index) => {
        const menus = getMenuForDate(date);
        const lunchMenu = menus.find(m => m.type === '점심식대');
        const dinnerMenu = menus.find(m => ['저녁식대', '야근식대'].includes(m.type));
        const hasDrinking = menus.some(m => m.isDrinking);
        
        return (
          <div
            key={index}
            className={`p-1 min-h-[60px] sm:min-h-[100px] border ${
              isCurrentMonth ? 'bg-white' : 'bg-gray-50'
            } ${hasDrinking ? 'bg-yellow-100' : ''}`}
          >
            <div className="text-xs sm:text-sm mb-1 flex items-center gap-1">
              <span>{date.getDate()}</span>
              {hasDrinking && (
                <Beer className="h-3 w-3 sm:h-4 sm:w-4 text-amber-500" />
              )}
            </div>
            {lunchMenu && (
              <div className="text-[10px] sm:text-xs p-0.5 sm:p-1 mb-0.5 sm:mb-1 bg-blue-100 rounded break-words">
                {lunchMenu.menu}
              </div>
            )}
            {dinnerMenu && (
              <div className="text-[10px] sm:text-xs p-0.5 sm:p-1 bg-orange-100 rounded break-words">
                {dinnerMenu.menu}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
} 