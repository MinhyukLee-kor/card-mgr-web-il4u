'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Loading } from "@/components/ui/loading";
import { ChangePasswordModal } from '@/components/ChangePasswordModal';

interface User {
  email: string;
  name: string;
}

export default function MyPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  const handleChangePassword = () => {
    setIsModalOpen(true);
  };

  return (
    <div className="container mx-auto py-4 px-2 sm:py-10 sm:px-4">
      {isLoading && <Loading />}
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>내 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">이메일</label>
            <Input
              type="email"
              value={user?.email || ''}
              disabled
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">이름</label>
            <Input
              type="text"
              value={user?.name || ''}
              disabled
            />
          </div>

          <Button 
            onClick={handleChangePassword}
            className="w-full"
          >
            비밀번호 변경
          </Button>
        </CardContent>
      </Card>
      
      <ChangePasswordModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
} 