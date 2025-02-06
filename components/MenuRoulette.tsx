'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import Select from 'react-select';

interface MenuRouletteProps {
  menus: string[];
}

export function MenuRoulette({ menus }: MenuRouletteProps) {
  const [selectedMenus, setSelectedMenus] = useState<string[]>([]);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<string>('');
  const [useCustomSelection, setUseCustomSelection] = useState(false);
  const spinnerRef = useRef<HTMLDivElement>(null);

  const menuOptions = menus.map(menu => ({
    value: menu,
    label: menu
  }));

  const spin = () => {
    if (spinning) return;
    
    const targetMenus = useCustomSelection ? selectedMenus : menus;
    if (targetMenus.length === 0) {
      alert('선택된 메뉴가 없습니다.');
      return;
    }

    setSpinning(true);
    setResult('');

    // 랜덤한 시간 동안 스핀 (2~4초)
    const duration = 2000 + Math.random() * 2000;
    
    // 스핀 애니메이션 시작
    if (spinnerRef.current) {
      spinnerRef.current.style.animation = 'none';
      spinnerRef.current.offsetHeight; // 리플로우 강제
      spinnerRef.current.style.animation = `spin ${duration}ms cubic-bezier(0.5, 0, 0.5, 1)`;
    }

    // 결과 선택 및 표시
    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * targetMenus.length);
      setResult(targetMenus[randomIndex]);
      setSpinning(false);
    }, duration);
  };

  // useEffect를 사용하여 스타일 추가
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        0% { transform: rotateX(0); }
        100% { transform: rotateX(720deg); }
      }
    `;
    document.head.appendChild(style);

    // 컴포넌트 언마운트 시 스타일 제거
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>메뉴 추천</span>
          <div className="flex items-center space-x-2">
            <label className="text-sm font-normal cursor-pointer">
              <input
                type="checkbox"
                className="mr-2"
                checked={useCustomSelection}
                onChange={(e) => {
                  setUseCustomSelection(e.target.checked);
                  setSelectedMenus([]);
                }}
              />
              메뉴 직접 선택
            </label>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {useCustomSelection && (
          <div className="mb-4">
            <Select
              isMulti
              options={menuOptions}
              value={menuOptions.filter(option => selectedMenus.includes(option.value))}
              onChange={(selected) => {
                setSelectedMenus(selected ? selected.map(option => option.value) : []);
              }}
              placeholder="메뉴를 선택하세요"
              noOptionsMessage={() => "선택 가능한 메뉴가 없습니다"}
              className="mb-4"
              styles={{
                control: (base) => ({
                  ...base,
                  minHeight: '40px',
                }),
                menu: (base) => ({
                  ...base,
                  zIndex: 50
                })
              }}
              theme={(theme) => ({
                ...theme,
                colors: {
                  ...theme.colors,
                  primary: '#2563eb',
                  primary25: '#eff6ff'
                }
              })}
            />
          </div>
        )}

        <div className="flex flex-col items-center">
          <div 
            className="relative w-64 h-16 border-2 border-blue-500 rounded-lg overflow-hidden mb-4 bg-white"
            style={{ perspective: '1000px' }}
          >
            <div
              ref={spinnerRef}
              className="absolute inset-0 flex items-center justify-center text-xl font-bold"
            >
              {result || (spinning ? '🎲' : '?')}
            </div>
          </div>

          <Button
            onClick={spin}
            disabled={spinning}
            className="w-full max-w-xs"
          >
            {spinning ? '추천 중...' : '메뉴 추천받기'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 