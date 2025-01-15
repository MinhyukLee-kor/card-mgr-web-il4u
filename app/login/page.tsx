'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useForm } from "react-hook-form";
import { LoginForm } from '@/types/auth';
import { Loading } from "@/components/ui/loading";
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string>('');
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>();
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async (data: LoginForm) => {
    try {
      setIsLoading(true);
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

      router.push(result.redirectTo || '/');
      router.refresh();
    } catch (error) {
      console.error('로그인 중 오류 발생:', error);
      setError('로그인 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[100vh] flex items-center justify-center bg-gray-50">
      {isLoading && <Loading />}
      <Card className="w-[350px]">
        <CardHeader>
          <CardTitle>로그인</CardTitle>
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

            <div className="text-center text-sm text-gray-500">
              계정이 없으신가요?{' '}
              <Link href="/signup" className="text-blue-600 hover:underline">
                회원가입
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 