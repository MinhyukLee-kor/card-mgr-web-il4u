'use client';

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Download } from 'lucide-react';

export function InstallPWA() {
  const [supportsPWA, setSupportsPWA] = useState(false);
  const [promptInstall, setPromptInstall] = useState<any>(null);

  useEffect(() => {
    const handler = (e: any) => {
      // PWA 설치 이벤트 저장
      e.preventDefault();
      setPromptInstall(e);
      setSupportsPWA(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!promptInstall) {
      return;
    }
    // 설치 프롬프트 표시
    promptInstall.prompt();
    // 사용자의 응답을 기다림
    const result = await promptInstall.userChoice;
    // 프롬프트 초기화
    setPromptInstall(null);
  };

  if (!supportsPWA) {
    return null;
  }

  return (
    <div className="fixed bottom-24 right-6 z-50">
      <Button
        onClick={handleInstall}
        className="flex items-center gap-2 shadow-lg bg-blue-500 hover:bg-blue-600"
      >
        <Download className="h-4 w-4" />
        <span>앱 설치하기</span>
      </Button>
    </div>
  );
} 