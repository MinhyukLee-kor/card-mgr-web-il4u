'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useForm } from "react-hook-form";
import { LoginForm } from '@/types/auth';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string>('');
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.message);
        return;
      }

      // 로그인 성공 시 메인 페이지로 이동
      router.push('/');
      router.refresh();
    } catch (error) {
      setError('로그인 처리 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="w-[350px]">
        <CardHeader>
          <CardTitle>로그인</CardTitle>
          <CardDescription>회사 이메일로 로그인하세요.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="email"
                placeholder="이메일"
                {...register('email', { required: true })}
              />
              {errors.email && (
                <span className="text-sm text-red-500">이메일을 입력하세요.</span>
              )}
            </div>
            
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="비밀번호"
                {...register('password', { required: true })}
              />
              {errors.password && (
                <span className="text-sm text-red-500">비밀번호를 입력하세요.</span>
              )}
            </div>

            {error && (
              <div className="text-sm text-red-500">{error}</div>
            )}

            <Button type="submit" className="w-full">
              로그인
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 